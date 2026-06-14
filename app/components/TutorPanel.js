'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '../contexts/ProgressContext';
import { useScenario } from '../contexts/ScenarioContext';
import { useSimNav }   from '../contexts/SimNavContext';

// ── Axion persona ─────────────────────────────────────────────
const AXION = 'Axion';

// ── Challenge banner texts ────────────────────────────────────
const CHALLENGE_BANNERS = {
  projectile: 'Challenge: Find the launch angle that gives the maximum range.',
  pendulum:   'Challenge: Adjust the length until the period reads exactly 2.00 s.',
  orbits:     'Challenge: Find the initial speed that keeps the planet in a stable circular orbit.',
  collisions: 'Challenge: With equal masses and e = 1 (elastic), make ball 1 stop completely.',
};

// ── Per-sim prediction questions ─────────────────────────────
const PREDICTIONS = {
  projectile: {
    q:       'Which launch angle gives the maximum range on flat ground (no air resistance)?',
    opts:    ['30°', '45°', '60°', '75°'],
    correct: '45°',
  },
  pendulum: {
    q:       'If you double the pendulum length, what happens to the period?',
    opts:    ['It doubles (×2)', 'It grows by ×√2 ≈ 1.41', 'It stays the same', 'It halves'],
    correct: 'It grows by ×√2 ≈ 1.41',
  },
  orbits: {
    q:       "For a perfectly circular orbit, the planet's speed must be…",
    opts:    ['Exactly the circular orbit speed', 'Slightly above it', 'Slightly below it', 'Any speed works'],
    correct: 'Exactly the circular orbit speed',
  },
  collisions: {
    q:       'In a perfectly elastic collision (e = 1), what is conserved?',
    opts:    ['Momentum only', 'Kinetic energy only', 'Both momentum and kinetic energy', 'Neither'],
    correct: 'Both momentum and kinetic energy',
  },
};

// ── Sim-entry greetings (text + optional action buttons) ──────
const GREETINGS = {
  projectile: {
    text:    `Hi — I'm ${AXION}. In projectile motion, gravity bends every path into a parabola. Angle and speed are everything. Before you launch, make a prediction: which angle gives the longest range?`,
    actions: [
      { type: 'scenario', target: 'proj-max-range', label: '→ Set up a 45° launch' },
      { type: 'scenario', target: 'proj-moon-shot', label: '→ Try a Moon shot' },
    ],
  },
  pendulum: {
    text:    `Hi — I'm ${AXION}. The pendulum hides a beautiful secret: the period barely cares about the swing angle — it's the length that matters. Predict first: what happens to the period if you double the length?`,
    actions: [
      { type: 'scenario', target: 'pend-seconds', label: '→ Set up seconds pendulum' },
      { type: 'scenario', target: 'pend-moon',    label: '→ Try Moon gravity' },
    ],
  },
  orbits: {
    text:    `Hi — I'm ${AXION}. A planet orbits when its speed is exactly right to keep curving around the star — too slow and gravity wins, too fast and it escapes. Try a few speeds and see which way your gut was off.`,
    actions: [
      { type: 'scenario', target: 'orb-stable', label: '→ Set stable orbit speed' },
      { type: 'scenario', target: 'orb-escape', label: '→ Try escape velocity' },
    ],
  },
  collisions: {
    text:    `Hi — I'm ${AXION}. Two balls, one collision — momentum always survives the hit, but kinetic energy has other plans. Try elastic (e = 1) and sticky (e = 0) and watch what's different.`,
    actions: [
      { type: 'scenario', target: 'col-elastic',   label: '→ Set up elastic collision' },
      { type: 'scenario', target: 'col-dead-stop', label: '→ Set up dead stop' },
    ],
  },
};

// ── Scripted moment reactions ─────────────────────────────────
const MOMENT_REACTIONS = {
  projectile: [
    {
      key:       'hit-target',
      condition: (s) => s.hitResult === 'hit',
      text:      `Direct hit! The horizontal speed stayed constant the whole way — only the vertical changed due to gravity. That parabolic arc is the geometry of constant acceleration. Try the scratchpad: x = v₀t, y = v₀t − ½gt².`,
      actions:   [],
    },
    {
      key:       'max-angle',
      condition: (s) => s.launched && s.angle >= 44 && s.angle <= 46,
      text:      `45° — the sweet spot on flat ground. The horizontal and vertical velocity components are perfectly balanced here. Want to see what the same launch looks like on the Moon?`,
      actions:   [{ type: 'scenario', target: 'proj-moon-shot', label: '→ Try it on the Moon' }],
    },
    {
      key:       'moon-shot',
      condition: (s) => s.launched && s.gravity <= 1.7 && s.range >= 600,
      text:      `Moon long shot! With only 1.6 m/s² instead of 9.8, the ball stays airborne ~6× longer. Same launch, wildly different result. Want to compare with Earth gravity?`,
      actions:   [{ type: 'scenario', target: 'proj-max-range', label: '→ Compare with Earth' }],
    },
  ],
  pendulum: [
    {
      key:       'moon-swing',
      condition: (s) => s.running && s.gravity <= 1.7,
      text:      `Moon gravity — notice the slower swing? T = 2π√(L/g): with g = 1.6 instead of 9.8, the period grows by √(9.8/1.6) ≈ 2.5×. Try the scratchpad to verify the ratio.`,
      actions:   [],
    },
    {
      key:       'two-sec',
      condition: (s) => s.running && Math.abs(s.period - 2.0) <= 0.1,
      text:      `Almost exactly 2 seconds — the "seconds pendulum" used in early precision clocks! At Earth gravity it needs about 0.99 m. Is your length close?`,
      actions:   [],
    },
    {
      key:       'long-swing',
      condition: (s) => s.running && s.period >= 4.0,
      text:      `A 4-second swing needs a surprisingly long rod. The formula scales with √L, not L — so to double the period you have to quadruple the length.`,
      actions:   [],
    },
  ],
  collisions: [
    {
      key:       'elastic-hit',
      condition: (s) => s.collided && Math.abs(s.e - 1.0) < 0.05,
      text:      `Perfectly elastic — kinetic energy bounced right through! Real billiard balls come close to this, which is why pool is so predictable once you know the angles.`,
      actions:   [{ type: 'scenario', target: 'col-dead-stop', label: '→ Try the dead stop' }],
    },
    {
      key:       'inelastic-hit',
      condition: (s) => s.collided && Math.abs(s.e) < 0.05,
      text:      `Perfectly inelastic — they stuck together! All the "lost" kinetic energy went into deformation, heat, and sound. Momentum still conserved though.`,
      actions:   [{ type: 'scenario', target: 'col-elastic', label: '→ Compare with elastic' }],
    },
  ],
};

// Orbital: fires on every status transition, can repeat per launch
const ORBITAL_REACTIONS = {
  orbiting: {
    text:    `Stable orbit! The planet's speed is exactly right — it's constantly falling, but the star curves away beneath it. That's literally what orbiting means.`,
    actions: [{ type: 'scenario', target: 'orb-escape', label: '→ Now try escape velocity' }],
  },
  escaped: {
    text:    `Escape velocity! Above that threshold, gravity can slow the planet but never curve its path back. This is how Voyager 1 left the solar system in 1977.`,
    actions: [{ type: 'scenario', target: 'orb-crash', label: '→ Now try a crash' }],
  },
  crashed: {
    text:    `Crash into the star. The orbital speed was too low, so gravity won. In real space this is how some comets spiral into the sun over millions of years.`,
    actions: [{ type: 'scenario', target: 'orb-stable', label: '→ Find stable orbit' }],
  },
};

// ── Challenge completion reactions → { text, actions } ───────
const CHALLENGE_REACTIONS = {
  'proj-hit-target': (rem) => ({ text: `Target logged! ${rem > 0 ? `${rem} projectile challenge${rem > 1 ? 's' : ''} left.` : 'All projectile challenges cleared! 🌟'}`, actions: [] }),
  'proj-max-angle':  (rem) => ({ text: `45° confirmed — physics golden angle! ${rem > 0 ? `${rem} more here.` : 'All projectile challenges cleared! 🌟'}`, actions: [] }),
  'proj-moon-shot':  (rem) => ({ text: `Moon long shot complete! ${rem > 0 ? `${rem} more here.` : 'All projectile challenges cleared! 🌟'}`, actions: [] }),
  'pend-2s':         (rem) => ({ text: `Seconds pendulum nailed! ${rem > 0 ? `${rem} more pendulum challenges.` : 'All pendulum challenges cleared! 🌟'}`, actions: [] }),
  'pend-moon':       (rem) => ({ text: `Moon swing done! ${rem > 0 ? `${rem} more here.` : 'All pendulum challenges cleared! 🌟'}`, actions: [] }),
  'pend-long':       (rem) => ({ text: `Slow swing — 4× length for 2× period. ${rem > 0 ? `${rem} more here.` : 'All pendulum challenges cleared! 🌟'}`, actions: [] }),
  'orb-stable': (rem) => ({
    text:    `Stable orbit logged! ${rem > 0 ? `${rem} more orbital challenges — push it to the extremes.` : 'All orbital challenges cleared! 🌟'}`,
    actions: rem > 0 ? [{ type: 'scenario', target: 'orb-escape', label: '→ Try escape velocity' }] : [],
  }),
  'orb-escape': (rem) => ({
    text:    `Escape velocity reached! ${rem > 0 ? `${rem} more here.` : 'All orbital challenges cleared! 🌟'}`,
    actions: rem > 0 ? [{ type: 'scenario', target: 'orb-crash', label: '→ Now try a crash' }] : [],
  }),
  'orb-crash': (rem) => ({
    text:    `Crash logged! ${rem > 0 ? `${rem} more orbital challenges.` : 'All orbital challenges cleared! 🌟'}`,
    actions: rem > 0 ? [{ type: 'scenario', target: 'orb-stable', label: '→ Find stable orbit' }] : [],
  }),
  'col-elastic':   (rem) => ({ text: `Elastic collision confirmed! ${rem > 0 ? `${rem} more collision challenges.` : 'All collision challenges cleared! 🌟'}`, actions: rem > 0 ? [{ type: 'scenario', target: 'col-dead-stop', label: '→ Try dead stop' }] : [] }),
  'col-inelastic': (rem) => ({ text: `Sticky collision done! ${rem > 0 ? `${rem} more here.` : 'All collision challenges cleared! 🌟'}`, actions: [] }),
  'col-stop':      (rem) => ({ text: `Dead stop! Equal masses + elastic = perfect momentum transfer. ${rem > 0 ? `${rem} more.` : 'All collision challenges cleared! 🌟'}`, actions: [] }),
};

function getChallengeSimId(id) {
  if (id?.startsWith('proj')) return 'projectile';
  if (id?.startsWith('pend')) return 'pendulum';
  if (id?.startsWith('orb'))  return 'orbits';
  if (id?.startsWith('col'))  return 'collisions';
  return null;
}

function stateToText(s) {
  return Object.entries(s)
    .filter(([k]) => k !== 'simId')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

// ── Parse [ACT:type:target|Label] tags from AI responses ─────
function parseActions(content) {
  const TAG = /\[ACT:([^|\]]+)(?:\|([^\]]*))?\]/g;
  const actions = [];
  let match;
  while ((match = TAG.exec(content)) !== null) {
    const parts  = match[1].split(':');
    const type   = parts[0];
    const target = parts.slice(1).join(':');
    const label  = (match[2] ?? `→ ${target}`).trim();
    if (type && target) actions.push({ type, target, label });
  }
  const text = content.replace(/\[ACT:[^\]]+\]/g, '').replace(/  +/g, ' ').trim();
  return { text, actions };
}

// ── Axion avatar ──────────────────────────────────────────────
function AxionAvatar({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #6d6af8, #22d3ee)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
    }}>
      A
    </div>
  );
}

// ── Action button (used in chat bubbles) ──────────────────────
function ActionBtn({ action, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onClick(action)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
      style={{
        background:   hovered ? 'rgba(109,106,248,0.22)' : 'rgba(109,106,248,0.1)',
        border:       '1px solid rgba(109,106,248,0.28)',
        color:        '#8b88fb',
        cursor:       'pointer',
        transition:   'background 0.12s',
        whiteSpace:   'nowrap',
      }}
    >
      {action.label}
    </button>
  );
}

// ── TutorPanel ────────────────────────────────────────────────
// Props:
//   simId     — 'projectile' | 'pendulum' | 'orbits' | 'collisions'
//   simState  — formatted object sent to the AI (display strings)
//   hasResult — bool: sim has produced an evaluable outcome
//   rawState  — raw numbers for moment detection (not sent to AI)
export default function TutorPanel({ simId, simState, hasResult, rawState }) {
  const router = useRouter();
  const { justCompleted, challengesWithStatus, trackPrediction } = useProgress();
  const { dispatchScenario } = useScenario();
  const { navigateToSim }    = useSimNav();

  const pred          = PREDICTIONS[simId];
  const challengeText = CHALLENGE_BANNERS[simId];

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasNew,      setHasNew]      = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [locked,      setLocked]      = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const bottomRef        = useRef(null);
  const reactedKeys      = useRef(new Set());
  const prevOrbStatus    = useRef(null);
  const completedReacted = useRef(null);

  // ── Stable inject: adds a proactive message with optional actions ─
  const inject = useCallback((text, actions = []) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: text, proactive: true, actions }]);
    setHasNew(true);
  }, []);

  // ── Scroll to latest message ──────────────────────────────────────
  useEffect(() => {
    if (!isCollapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCollapsed]);

  // ── Greeting: once on mount ───────────────────────────────────────
  useEffect(() => {
    const g = GREETINGS[simId];
    if (g) setMessages([{ role: 'assistant', content: g.text, proactive: true, actions: g.actions }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Moment reactions: every render, guarded by reactedKeys ───────
  useEffect(() => {
    if (!rawState) return;

    // Condition-based (projectile, pendulum, collisions)
    for (const r of (MOMENT_REACTIONS[simId] ?? [])) {
      if (reactedKeys.current.has(r.key)) continue;
      if (r.condition(rawState)) {
        reactedKeys.current.add(r.key);
        inject(r.text, r.actions);
      }
    }

    // Orbital: react on every status transition
    if (simId === 'orbits') {
      const cur  = rawState.status;
      const prev = prevOrbStatus.current;
      if (cur !== prev && ORBITAL_REACTIONS[cur]) {
        const rx = ORBITAL_REACTIONS[cur];
        inject(rx.text, rx.actions);
      }
      prevOrbStatus.current = cur;
    }
  }); // no dep array

  // ── Challenge completion reaction ─────────────────────────────────
  useEffect(() => {
    if (!justCompleted || completedReacted.current === justCompleted) return;
    completedReacted.current = justCompleted;
    const challengeSimId = getChallengeSimId(justCompleted);
    const simChallenges  = challengesWithStatus.filter((c) => c.simId === challengeSimId);
    const remaining      = simChallenges.filter((c) => !c.done).length;
    const fn             = CHALLENGE_REACTIONS[justCompleted];
    if (fn) { const r = fn(remaining); inject(r.text, r.actions); }
  }, [justCompleted, inject, challengesWithStatus]);

  // ── Execute an action button ──────────────────────────────────────
  function executeAction(action) {
    switch (action.type) {
      case 'nav':
        if (action.target === 'hub') router.push('/hub');
        else navigateToSim(action.target);
        break;
      case 'scenario':
        dispatchScenario(action.target);
        break;
    }
  }

  // ── Send to AI ────────────────────────────────────────────────────
  async function sendToAI(userContent) {
    if (loading) return;
    const newMsgs = [...messages, { role: 'user', content: userContent }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:   newMsgs.map(({ role, content }) => ({ role, content })),
          simState,
          prediction: locked ? { question: pred.q, selected, correct: pred.correct } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'missing_key'
          ? `Axion is offline — GROQ_API_KEY not found. Add it to your environment and restart the server.`
          : `Something went wrong (${data.message ?? 'unknown error'}). Try again in a moment.`;
        setMessages((prev) => [...prev, { role: 'assistant', content: msg, error: true, actions: [] }]);
      } else {
        const { text, actions } = parseActions(data.reply);
        setMessages((prev) => [...prev, { role: 'assistant', content: text, actions }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Couldn't reach Axion — check your network or restart the dev server.`, error: true, actions: [] }]);
    } finally {
      setLoading(false);
    }
  }

  function handleOutcomeRequest() {
    const stateDesc = stateToText(simState);
    const isCorrect = selected === pred.correct;
    sendToAI(
      `I predicted "${selected}" for: "${pred.q}". The sim shows: [${stateDesc}]. ` +
      (isCorrect
        ? 'I think I got it right — confirm and explain the physics?'
        : 'Was I right? Explain what actually happened.')
    );
  }

  function handleLockIn() {
    setLocked(true);
    if (selected !== null) trackPrediction(selected === pred.correct);
  }

  function handleSend() {
    const t = input.trim();
    if (t) sendToAI(t);
  }

  const isCorrect = locked && selected === pred.correct;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>

      {/* ── Header / collapse toggle ── */}
      <button
        onClick={() => { setIsCollapsed((v) => !v); if (isCollapsed) setHasNew(false); }}
        className="w-full flex items-center justify-between px-5 py-3.5"
        style={{
          background:   'rgba(109,106,248,0.06)',
          border:       'none',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
          cursor:       'pointer',
          textAlign:    'left',
        }}
      >
        <div className="flex items-center gap-2.5">
          <AxionAvatar size={28} />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{AXION}</span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>AI Physics Guide</span>
          </div>
          {isCollapsed && hasNew && (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6d6af8', flexShrink: 0 }} />
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
          {isCollapsed ? '▸ Show' : '▾ Hide'}
        </span>
      </button>

      {/* ── Expanded body ── */}
      {!isCollapsed && (
        <div className="axiom-expand p-4 sm:p-5 space-y-4 sm:space-y-5">

          {/* Challenge banner */}
          <div className="px-4 py-3 rounded-lg flex items-center gap-3"
            style={{ background: 'rgba(109,106,248,0.08)', border: '1px solid rgba(109,106,248,0.2)' }}>
            <span style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>★</span>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{challengeText}</p>
          </div>

          {/* Prediction card */}
          <div className="rounded-lg p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Predict before you run
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>{pred.q}</p>
            {!locked ? (
              <>
                <div className="space-y-2 mb-4">
                  {pred.opts.map((opt) => (
                    <label key={opt} className="flex items-center gap-2.5" style={{ cursor: 'pointer' }}>
                      <input type="radio" name={`pred-${simId}`} value={opt}
                        checked={selected === opt} onChange={() => setSelected(opt)}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                      <span className="text-sm" style={{ color: selected === opt ? 'var(--text)' : 'var(--text-muted)' }}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
                <button disabled={!selected} onClick={handleLockIn}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-lg"
                  style={{
                    background: selected ? 'var(--accent)' : 'transparent',
                    color:      selected ? '#fff' : 'var(--text-muted)',
                    border:     `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    cursor:     selected ? 'pointer' : 'not-allowed',
                    opacity:    selected ? 1 : 0.45, transition: 'background 0.15s',
                  }}>
                  Lock in my prediction →
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your prediction</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: isCorrect ? '#4ade80' : 'var(--text)' }}>
                    {selected}{hasResult && isCorrect ? ' ✓' : ''}
                  </p>
                </div>
                {hasResult && (
                  <button onClick={handleOutcomeRequest} disabled={loading}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: '#6d6af8', color: '#fff', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1, border: 'none' }}>
                    How did I do? →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Chat history */}
          {(messages.length > 0 || loading) && (
            <div className="space-y-3 overflow-y-auto pr-1"
              style={{ maxHeight: 360, scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex items-start ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div style={{ marginRight: 8, marginTop: 3, flexShrink: 0 }}>
                      <AxionAvatar size={20} />
                    </div>
                  )}
                  <div style={m.role === 'user'
                    ? { background: 'var(--accent)', color: '#fff', padding: '8px 13px', borderRadius: '12px 12px 2px 12px', maxWidth: '72%' }
                    : m.error
                    ? { background: 'rgba(248,113,113,0.07)', color: 'var(--text-muted)', border: '1px solid rgba(248,113,113,0.22)', padding: '8px 13px', borderRadius: '12px 12px 12px 2px', maxWidth: '85%' }
                    : { background: m.proactive ? 'rgba(109,106,248,0.07)' : 'var(--bg-muted)', color: 'var(--text)', border: `1px solid ${m.proactive ? 'rgba(109,106,248,0.2)' : 'var(--border)'}`, padding: '8px 13px', borderRadius: '12px 12px 12px 2px', maxWidth: '85%' }
                  }>
                    <p className="text-sm leading-relaxed">{m.content}</p>
                    {/* Action buttons */}
                    {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2"
                        style={{ borderTop: '1px solid rgba(109,106,248,0.15)' }}>
                        {m.actions.map((action, ai) => (
                          <ActionBtn key={ai} action={action} onClick={executeAction} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start justify-start">
                  <div style={{ marginRight: 8, marginTop: 3, flexShrink: 0 }}><AxionAvatar size={20} /></div>
                  <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '12px 12px 12px 2px' }}>
                    <div className="axiom-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Ask box */}
          <div className="flex gap-2">
            <input type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Ask Axion anything…`} disabled={loading}
              className="flex-1 px-3.5 py-2 rounded-lg text-sm border"
              style={{
                background: 'var(--bg-muted)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                outline: 'none',
                cursor: loading ? 'not-allowed' : 'text',
                opacity: loading ? 0.6 : 1,
              }} />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
              style={{
                background:  input.trim() && !loading ? 'var(--accent)' : 'transparent',
                color:       input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                border:      '1px solid',
                borderColor: input.trim() && !loading ? 'var(--accent)' : 'var(--border)',
                cursor:      input.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity:     input.trim() && !loading ? 1 : 0.4,
                transition:  'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s',
              }}>
              Ask
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
