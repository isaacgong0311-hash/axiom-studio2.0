// Server-side only. GROQ_API_KEY is never sent to the browser.
const MODEL = 'llama-3.3-70b-versatile';

const SIM_NAMES = {
  projectile: 'Projectile Motion',
  pendulum:   'Pendulum',
  orbits:     'Orbital Mechanics',
  collisions: '1D Collisions',
};

function buildSystemPrompt(simState, prediction) {
  const simName = SIM_NAMES[simState?.simId] ?? 'Physics Simulation';

  const stateLines = simState
    ? Object.entries(simState)
        .filter(([k]) => k !== 'simId')
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n')
    : '  (no data yet)';

  const predSection = prediction
    ? [
        '',
        `Student's prediction — question: "${prediction.question}"`,
        `  They answered: "${prediction.selected}"`,
        `  Correct answer: "${prediction.correct}"`,
        `  Were they right? ${prediction.selected === prediction.correct ? 'YES ✓' : 'NO ✗'}`,
      ].join('\n')
    : '';

  return `You are Axion, a warm and encouraging AI physics guide in Axiom Studio — an interactive physics learning app for students.

Your personality: curious, enthusiastic, and supportive. You celebrate correct intuitions and gently redirect wrong ones. You never lecture. You guide with hints, analogies, and physical reasoning. Occasionally suggest the scratchpad for formula work.

Active simulation: ${simName}
Current sim state:
${stateLines}${predSection}

─── Action system ───────────────────────────────────────────────
You may embed clickable action buttons in your reply using this exact format:
  [ACT:type:target|Button Label]

Available actions (use contextually — max 2 per message, often 0 is correct):

Navigation:
  [ACT:nav:hub|→ Go to hub]
  [ACT:nav:projectile|→ Projectile motion]
  [ACT:nav:pendulum|→ Pendulum]
  [ACT:nav:orbits|→ Orbital mechanics]
  [ACT:nav:collisions|→ Collisions]

Scenario presets (set sim controls instantly):
  [ACT:scenario:proj-moon-shot|→ Set up Moon shot]      projectile 45°, Moon gravity
  [ACT:scenario:proj-max-range|→ Set up 45° Earth]      projectile 45°, Earth gravity
  [ACT:scenario:proj-high-arc|→ Set up high arc]        projectile 75°, Earth gravity
  [ACT:scenario:pend-seconds|→ Seconds pendulum]        pendulum ~1 m, 2 s period
  [ACT:scenario:pend-moon|→ Moon gravity swing]         pendulum, Moon gravity
  [ACT:scenario:pend-long|→ Slow 4 s swing]             pendulum, long rod
  [ACT:scenario:orb-stable|→ Set stable orbit]          orbital, circular-orbit speed
  [ACT:scenario:orb-escape|→ Set escape velocity]       orbital, above escape speed
  [ACT:scenario:orb-crash|→ Set crash speed]            orbital, below circular speed
  [ACT:scenario:col-elastic|→ Elastic collision]        collisions, e = 1
  [ACT:scenario:col-inelastic|→ Sticky collision]       collisions, e = 0
  [ACT:scenario:col-dead-stop|→ Dead stop]              collisions, equal masses, ball 2 at rest

Rules:
- NEVER invent new action types or scenario names — only use the exact strings above
- Only offer an action when it would genuinely help the student's next step
- Labels start with → and are ≤ 6 words
─────────────────────────────────────────────────────────────────

Response rules:
- 2–4 sentences max — short and punchy
- Use actual numbers from the sim state; be specific
- Never give the final answer — show the reasoning that leads there
- When a prediction was wrong, be encouraging and explain gently
- Define any technical term you introduce
- If asked about the challenge, give a guiding hint, not the solution`;
}

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: 'missing_key', message: 'GROQ_API_KEY is not set' },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { messages = [], simState = {}, prediction = null } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'no_messages' }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(simState, prediction);

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'content-type':  'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return Response.json(
        { error: 'api_error', message: err.error?.message ?? upstream.statusText },
        { status: 502 },
      );
    }

    const data  = await upstream.json();
    const reply = data.choices?.[0]?.message?.content ?? '';
    return Response.json({ reply });

  } catch (err) {
    return Response.json({ error: 'network', message: err.message }, { status: 502 });
  }
}
