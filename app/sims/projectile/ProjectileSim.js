'use client';

import { useEffect, useRef, useState } from 'react';
import { calcReadouts, positionAt, velocityAt, trajectoryPoints } from './physics';
import { paintBackdrop, spawnBurst, stepBurst } from '../canvasFx';
import TutorPanel from '../../components/TutorPanel';
import { useSimChallenges } from '../../hooks/useSimChallenges';
import { useScenario } from '../../contexts/ScenarioContext';
import { SCENARIOS }   from '../scenarios';

// ── Canvas geometry ──────────────────────────────────────────
const CW = 700, CH = 400;
const PAD_L = 50, PAD_R = 30, PAD_T = 35, PAD_B = 45;
const W_DRAW = CW - PAD_L - PAD_R;
const H_DRAW = CH - PAD_T - PAD_B;
const ANIM_SPEED = 1.5;
const BALL_R = 8;

// ── Planet presets ───────────────────────────────────────────
const PLANETS = [
  { id: 'earth',  label: 'Earth',  g: 9.8  },
  { id: 'moon',   label: 'Moon',   g: 1.6  },
  { id: 'mars',   label: 'Mars',   g: 3.7  },
  { id: 'custom', label: 'Custom', g: null },
];

// ── Utility: generate a reachable target distance ────────────
function generateTarget(g) {
  // Max range at 45° with speed=50: R = v²/g
  const maxRange = (50 * 50) / g;
  // Place target at 20–75% of max range so it's always achievable
  return Math.round(maxRange * (0.20 + Math.random() * 0.55));
}

// ── Canvas helpers ───────────────────────────────────────────
function getScale(range, maxHeight) {
  const r = Math.max(range, 10);
  const h = Math.max(maxHeight, 3);
  return Math.min((W_DRAW * 0.88) / r, (H_DRAW * 0.82) / h);
}

function toCanvas(px, py, scale) {
  return { cx: PAD_L + px * scale, cy: CH - PAD_B - py * scale };
}

// Draws a directed arrow from (x1,y1) to (x2,y2) with optional label.
function drawArrow(ctx, x1, y1, x2, y2, color, label) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) return;

  const headLen = Math.min(10, len * 0.35);
  const ang = Math.atan2(dy, dx);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(ang - Math.PI / 6), y2 - headLen * Math.sin(ang - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(ang + Math.PI / 6), y2 - headLen * Math.sin(ang + Math.PI / 6));
  ctx.stroke();

  if (label) {
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    // Offset label past the arrowhead along its direction
    ctx.fillText(label, x2 + Math.cos(ang) * 13, y2 + Math.sin(ang) * 13 + 4);
  }
}

// ── Small toggle switch component ────────────────────────────
function Toggle({ label, on, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <button
        onClick={onChange}
        style={{
          position: 'relative', flexShrink: 0,
          width: 36, height: 20, borderRadius: 10,
          background: on ? 'var(--accent)' : 'var(--bg-muted)',
          border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: on ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
export default function ProjectileSim() {
  const canvasRef = useRef(null);

  // ── Core simulation state ────────────────────────────────
  const [angle,    setAngle]    = useState(45);
  const [speed,    setSpeed]    = useState(25);
  const [gravity,  setGravity]  = useState(9.8);
  const [gravPreset, setGravPreset] = useState('earth');
  const [launched, setLaunched] = useState(false);

  // ── Feature toggles — kept in refs so toggling mid-animation
  //    doesn't restart the RAF loop; only state is for toolbar UI
  const [showVectors, setShowVectors] = useState(false);
  const showVectorsRef = useRef(false);

  const [targetMode, setTargetMode] = useState(false);
  const targetModeRef = useRef(false);

  const [targetX, setTargetX] = useState(null);
  const targetXRef = useRef(null);

  // ── Result state ─────────────────────────────────────────
  const [hitResult,    setHitResult]    = useState(null); // null | 'hit' | 'miss'
  const [landingError, setLandingError] = useState(0);

  // Live readouts (update instantly as sliders move)
  const readouts = calcReadouts(angle, speed, gravity);

  // ── Handlers ─────────────────────────────────────────────
  function handleReset() {
    setLaunched(false);
    setHitResult(null);
    setLandingError(0);
  }

  function handleGravityChange(newG, preset) {
    setGravity(newG);
    setGravPreset(preset);
    if (launched) handleReset();
    if (targetModeRef.current) {
      const t = generateTarget(newG);
      setTargetX(t); targetXRef.current = t;
      setHitResult(null); setLandingError(0);
    }
  }

  function handleToggleVectors() {
    const next = !showVectors;
    setShowVectors(next);
    showVectorsRef.current = next;
  }

  function handleToggleTargetMode() {
    const next = !targetMode;
    setTargetMode(next);
    targetModeRef.current = next;
    if (next) {
      const t = generateTarget(gravity);
      setTargetX(t); targetXRef.current = t;
      setHitResult(null); setLandingError(0);
    } else {
      setTargetX(null); targetXRef.current = null;
      setHitResult(null); setLandingError(0);
    }
  }

  function handleNewTarget() {
    const t = generateTarget(gravity);
    setTargetX(t); targetXRef.current = t;
    handleReset();
  }

  // ── Scenario subscription ────────────────────────────────
  const { pendingScenario, clearScenario } = useScenario();
  useEffect(() => {
    if (!pendingScenario) return;
    const s = SCENARIOS[pendingScenario];
    if (!s || s.simId !== 'projectile') return;
    const v = s.values;
    if (v.angle     !== undefined) setAngle(v.angle);
    if (v.speed     !== undefined) setSpeed(v.speed);
    if (v.gravity   !== undefined) setGravity(v.gravity);
    if (v.gravPreset !== undefined) setGravPreset(v.gravPreset);
    setLaunched(false); setHitResult(null); setLandingError(0);
    clearScenario();
  }, [pendingScenario, clearScenario]);

  // ── Canvas drawing + animation ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const { range, maxHeight, timeOfFlight: T } = calcReadouts(angle, speed, gravity);
    const scale = getScale(range, maxHeight);
    const tc = (px, py) => toCanvas(px, py, scale);
    const groundY = CH - PAD_B; // canvas y of the ground

    // ── Sub-draw functions ─────────────────────────────────

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = PAD_L; x <= CW - PAD_R; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, groundY); ctx.stroke();
      }
      for (let y = groundY; y >= PAD_T; y -= 55) {
        ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(CW - PAD_R, y); ctx.stroke();
      }
    }

    function drawGround() {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD_L, groundY);
      ctx.lineTo(CW - PAD_R, groundY);
      ctx.stroke();
    }

    function drawLandingMarker() {
      if (range < 0.5) return;
      const { cx } = tc(range, 0);
      // Only draw if within canvas
      if (cx > PAD_L && cx < CW - PAD_R) {
        ctx.beginPath();
        ctx.arc(cx, groundY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(109,106,248,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function drawTarget() {
      const tgt = targetXRef.current;
      if (tgt === null) return;
      const { cx: tx } = tc(tgt, 0);

      // If off-screen right, show label at edge
      if (tx > CW - PAD_R + 5) {
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(239,68,68,0.65)';
        ctx.textAlign = 'right';
        ctx.fillText(`Target: ${tgt.toFixed(0)} m  →`, CW - PAD_R - 4, groundY - 10);
        ctx.textAlign = 'left';
        return;
      }

      // Bullseye rings
      [[22, 0.4], [12, 0.6], [4, 1.0]].forEach(([r, alpha]) => {
        ctx.beginPath();
        ctx.arc(tx, groundY, r, 0, Math.PI * 2);
        if (r === 4) {
          ctx.fillStyle = `rgba(239,68,68,${alpha})`;
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(239,68,68,${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Distance label
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(239,68,68,0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(`${tgt.toFixed(0)} m`, tx, groundY - 30);
      ctx.textAlign = 'left';
    }

    function drawArc() {
      const pts = trajectoryPoints(angle, speed, gravity);
      if (pts.length < 2) return;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(109,106,248,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const { cx, cy } = tc(p.x, p.y);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawTrail(t) {
      const tEnd = Math.min(t, T);
      ctx.strokeStyle = '#6d6af8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const pos = positionAt(angle, speed, (i / 80) * tEnd, gravity);
        const { cx, cy } = tc(pos.x, pos.y);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    function drawBall(t) {
      const phys = t > 0 ? positionAt(angle, speed, Math.min(t, T), gravity) : { x: 0, y: 0 };
      const { cx: bx, cy: by } = tc(phys.x, phys.y);

      // ── Shadow on ground (shrinks + fades as ball rises) ──
      if (phys.y > 0.3 && maxHeight > 0) {
        const hf = Math.min(1, phys.y / maxHeight);
        const alpha  = 0.5 * (1 - hf * 0.8);
        const shadowX = tc(phys.x, 0).cx;
        const radX = BALL_R * Math.max(0.4, 1 - hf * 0.55);
        ctx.beginPath();
        ctx.ellipse(shadowX, groundY, radX * 1.8, 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
        ctx.fill();
      }

      // ── Soft ambient glow ──
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(109,106,248,0.15)';
      ctx.fill();

      // ── 3-D shaded sphere ──
      // Highlight is off-center (top-left) to simulate directional light
      const hlx = bx - BALL_R * 0.32;
      const hly = by - BALL_R * 0.32;
      const grad = ctx.createRadialGradient(hlx, hly, BALL_R * 0.05, bx, by, BALL_R);
      grad.addColorStop(0,    'rgba(255,255,255,0.92)');  // specular highlight
      grad.addColorStop(0.18, '#c4c2ff');                 // bright indigo rim
      grad.addColorStop(0.55, '#6d6af8');                 // main body colour
      grad.addColorStop(1,    '#2a2870');                 // dark shadow edge
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function drawVectors(t) {
      if (T <= 0 || t <= 0) return;
      const tClamped = Math.min(t, T);
      const phys = positionAt(angle, speed, tClamped, gravity);
      const vel  = velocityAt(angle, speed, tClamped, gravity);
      const { cx: bx, cy: by } = tc(phys.x, phys.y);

      // Scale: initial total speed → 70px, components proportional
      const VS = 70 / Math.max(speed, 1);

      // Horizontal component — rightward arrow (cyan)
      drawArrow(ctx, bx, by, bx + vel.vx * VS, by, '#22d3ee', 'vₓ');

      // Vertical component — positive vy = upward in physics = -y in canvas
      drawArrow(ctx, bx, by, bx, by - vel.vy * VS, '#fbbf24', 'vy');
    }

    // ── Master frame ──────────────────────────────────────
    function drawFrame(t) {
      paintBackdrop(ctx, CW, CH, { glowY: CH * 0.5 });
      drawGrid();
      drawGround();
      drawLandingMarker();
      if (targetModeRef.current) drawTarget();
      drawArc();
      if (t > 0) drawTrail(t);
      drawBall(t);
      if (showVectorsRef.current && t > 0) drawVectors(t);
    }

    // ── Static (pre-launch) ───────────────────────────────
    if (!launched || T <= 0) {
      drawFrame(0);
      return;
    }

    // ── Animation loop ────────────────────────────────────
    let simTime = 0, lastTs = null, rafId;
    const sparks = [];
    let landed = false;

    function step(ts) {
      if (!lastTs) lastTs = ts;
      const realDt = Math.min((ts - lastTs) / 1000, 0.05);
      const dt = realDt * ANIM_SPEED;
      lastTs = ts;
      simTime += dt;

      drawFrame(Math.min(simTime, T));

      // On the first frame past landing: dust kick + evaluate target
      if (!landed && simTime >= T) {
        landed = true;
        const land = tc(range, 0);
        if (land.cx > PAD_L && land.cx < CW - PAD_R) {
          spawnBurst(sparks, land.cx, groundY, {
            color: '#c4c2ff', count: 22, speed: 150,
            dir: -Math.PI / 2, spread: Math.PI * 0.85,
          });
        }
        if (targetModeRef.current && targetXRef.current !== null) {
          const tol = Math.max(2.5, targetXRef.current * 0.03);
          const err = Math.abs(range - targetXRef.current);
          setLandingError(err);
          setHitResult(err <= tol ? 'hit' : 'miss');
        }
      }

      stepBurst(ctx, sparks, realDt);

      // Keep running while in flight or while sparks linger
      if (simTime < T || sparks.length > 0) {
        rafId = requestAnimationFrame(step);
      }
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);

    // Only physics inputs restart the animation.
    // Toggles (vectors, target) update via refs on the next RAF frame.
  }, [angle, speed, gravity, launched]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Challenge detection ───────────────────────────────────
  useSimChallenges('projectile', {
    hitResult,
    launched,
    angle,
    gravity,
    range: readouts.range,
  });

  // ── JSX ───────────────────────────────────────────────────
  const simState = {
    simId:       'projectile',
    angle:       `${angle}°`,
    speed:       `${speed} m/s`,
    gravity:     `${gravity} m/s²`,
    predictedRange:      `${readouts.range.toFixed(1)} m`,
    predictedMaxHeight:  `${readouts.maxHeight.toFixed(1)} m`,
    predictedFlightTime: `${readouts.timeOfFlight.toFixed(2)} s`,
    launched,
    ...(targetMode && targetX !== null ? { targetRange: `${targetX} m`, hitResult: hitResult ?? 'not yet run' } : {}),
  };

  return (
    <div className="flex flex-col gap-5">
    <div className="flex flex-col lg:flex-row gap-5">

      {/* Canvas */}
      <div className="flex-1 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <canvas ref={canvasRef} width={CW} height={CH}
          style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">

        {/* ── Controls ─── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Controls
          </p>

          <div className="space-y-5">
            {/* Angle */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Launch angle</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{angle}°</span>
              </div>
              <input type="range" min={1} max={89} value={angle} disabled={launched}
                onChange={(e) => { setAngle(Number(e.target.value)); if (launched) handleReset(); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>1°</span><span>89°</span>
              </div>
            </div>

            {/* Speed */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Initial speed</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{speed} m/s</span>
              </div>
              <input type="range" min={5} max={50} value={speed} disabled={launched}
                onChange={(e) => { setSpeed(Number(e.target.value)); if (launched) handleReset(); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>5 m/s</span><span>50 m/s</span>
              </div>
            </div>
          </div>

          {/* Planet presets */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Gravity
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PLANETS.map((p) => (
                <button key={p.id}
                  onClick={() => handleGravityChange(p.g ?? gravity, p.id)}
                  className="py-1.5 rounded-lg text-xs border transition-colors"
                  style={{
                    background:   gravPreset === p.id ? 'var(--accent)' : 'transparent',
                    color:        gravPreset === p.id ? '#fff' : 'var(--text-muted)',
                    borderColor:  gravPreset === p.id ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {p.id !== 'custom' ? `${p.label} ${p.g}` : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom gravity slider */}
            {gravPreset === 'custom' && (
              <div className="mt-3">
                <div className="flex justify-between mb-1.5 text-sm">
                  <span style={{ color: 'var(--text)' }}>Gravity</span>
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>{gravity.toFixed(1)} m/s²</span>
                </div>
                <input type="range" min={0.5} max={25} step={0.1} value={gravity}
                  onChange={(e) => handleGravityChange(Number(e.target.value), 'custom')}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>0.5</span><span>25 m/s²</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Options ─── */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Options
          </p>
          <Toggle label="Velocity vectors" on={showVectors} onChange={handleToggleVectors} />
          <Toggle label="Target challenge"  on={targetMode}  onChange={handleToggleTargetMode} />
        </div>

        {/* ── Readouts ─── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Readouts
          </p>
          <div className="space-y-3.5">
            {[
              { label: 'Range',          value: readouts.range.toFixed(1),        unit: 'm' },
              { label: 'Max height',     value: readouts.maxHeight.toFixed(1),    unit: 'm' },
              { label: 'Time of flight', value: readouts.timeOfFlight.toFixed(2), unit: 's' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                  {value}<span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>
                </span>
              </div>
            ))}

            {/* Target row — shown when target mode is on */}
            {targetMode && targetX !== null && (
              <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: '#ef4444' }}>Target</span>
                <span className="font-mono text-sm" style={{ color: '#ef4444' }}>
                  {targetX}<span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>m</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Buttons ─── */}
        <div className="flex gap-3">
          <button onClick={() => setLaunched(true)} disabled={launched}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: launched ? 0.4 : 1, cursor: launched ? 'not-allowed' : 'pointer' }}>
            Launch
          </button>
          <button onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
            Reset
          </button>
        </div>

        {/* New Target button */}
        {targetMode && (
          <button onClick={handleNewTarget}
            className="w-full py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
            New Target
          </button>
        )}

        {/* Hit / Miss result */}
        {hitResult && (
          <div className="rounded-lg px-4 py-3 text-sm text-center font-medium"
            style={{
              background:  hitResult === 'hit' ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
              border:      `1px solid ${hitResult === 'hit' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color:       hitResult === 'hit' ? '#4ade80' : '#f87171',
            }}>
            {hitResult === 'hit'
              ? 'Hit! Great shot!'
              : `Missed — ${landingError.toFixed(1)} m off`}
          </div>
        )}

      </div>
    </div>

    <TutorPanel
      simId="projectile"
      simState={simState}
      hasResult={launched}
      rawState={{ hitResult, launched, angle, gravity, range: readouts.range }}
    />
    </div>
  );
}
