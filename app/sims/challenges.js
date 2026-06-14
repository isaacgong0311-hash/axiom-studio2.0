// Challenge definitions — pure data (no JSX).
// Each challenge has:
//   id      — unique key, used in localStorage and as React key
//   simId   — which sim it belongs to
//   label   — short name shown in the challenge strip
//   hint    — one-line guide shown on hover / in the list

export const CHALLENGES = [
  // ── Projectile Motion ──────────────────────────────────────
  {
    id:    'proj-hit-target',
    simId: 'projectile',
    label: 'Hit the target',
    hint:  'Enable target mode and land the ball on the bullseye.',
  },
  {
    id:    'proj-max-angle',
    simId: 'projectile',
    label: 'Optimal angle',
    hint:  'Find the launch angle that gives the maximum range (hint: it\'s a clean number).',
  },
  {
    id:    'proj-moon-shot',
    simId: 'projectile',
    label: 'Moon long shot',
    hint:  'Switch to Moon gravity and clear 600 m.',
  },

  // ── Pendulum ───────────────────────────────────────────────
  {
    id:    'pend-2s',
    simId: 'pendulum',
    label: '2-second pendulum',
    hint:  'Tune the length until the period reads exactly 2.00 s.',
  },
  {
    id:    'pend-moon',
    simId: 'pendulum',
    label: 'Moon swing',
    hint:  'Run the pendulum under Moon gravity and compare it to Earth.',
  },
  {
    id:    'pend-long',
    simId: 'pendulum',
    label: 'Slow swing',
    hint:  'Make the period 4 seconds or longer — what length does that need?',
  },

  // ── Orbital Mechanics ──────────────────────────────────────
  {
    id:    'orb-stable',
    simId: 'orbits',
    label: 'Stable orbit',
    hint:  'Find the exact speed that keeps the planet going around indefinitely.',
  },
  {
    id:    'orb-escape',
    simId: 'orbits',
    label: 'Escape velocity',
    hint:  'Push the speed high enough for the planet to break free entirely.',
  },
  {
    id:    'orb-crash',
    simId: 'orbits',
    label: 'Crash into the star',
    hint:  'Launch too slowly and let gravity pull the planet all the way in.',
  },

  // ── Collisions ─────────────────────────────────────────────
  {
    id:    'col-elastic',
    simId: 'collisions',
    label: 'Elastic collision',
    hint:  'Set e = 1 and watch kinetic energy survive the impact intact.',
  },
  {
    id:    'col-inelastic',
    simId: 'collisions',
    label: 'Sticky collision',
    hint:  'Set e = 0 — the balls stick together at impact.',
  },
  {
    id:    'col-stop',
    simId: 'collisions',
    label: 'Dead stop',
    hint:  'Equal masses, e = 1, ball 2 at rest: ball 1 stops completely. Try it.',
  },
];

// Grouped for fast lookup
export const CHALLENGES_BY_SIM = Object.fromEntries(
  ['projectile', 'pendulum', 'orbits', 'collisions'].map((simId) => [
    simId,
    CHALLENGES.filter((c) => c.simId === simId),
  ]),
);

// ── Challenge detectors ────────────────────────────────────
// Each detector receives a flat `state` object built in the sim component.
// They must be pure functions (no side effects, no React).
export const DETECTORS = {
  // Projectile
  'proj-hit-target': (s) => s.hitResult === 'hit',
  'proj-max-angle':  (s) => s.launched && s.angle >= 44 && s.angle <= 46,
  'proj-moon-shot':  (s) => s.launched && s.gravity <= 1.7 && s.range >= 600,

  // Pendulum
  'pend-2s':   (s) => s.running && Math.abs(s.period - 2.0) <= 0.05,
  'pend-moon': (s) => s.running && s.gravity <= 1.7,
  'pend-long': (s) => s.running && s.period >= 4.0,

  // Orbital
  'orb-stable': (s) => s.status === 'orbiting',
  'orb-escape': (s) => s.status === 'escaped',
  'orb-crash':  (s) => s.status === 'crashed',

  // Collisions
  'col-elastic':   (s) => s.collided && Math.abs(s.e - 1.0) < 0.01,
  'col-inelastic': (s) => s.collided && Math.abs(s.e)        < 0.01,
  'col-stop': (s) =>
    s.collided &&
    Math.abs(s.e - 1.0)            < 0.01  &&
    Math.abs(s.mass1 - s.mass2)    < 0.5   &&
    Math.abs(s.vel2)               < 0.1   &&
    s.v1After !== null &&
    s.v1After !== undefined &&
    Math.abs(s.v1After) < 0.3,
};
