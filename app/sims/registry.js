// ─────────────────────────────────────────────────────────────
// Simulation registry
// To add a new sim: append an entry here, set status to
// 'active', and wire up its component in SimLab.js.
// ─────────────────────────────────────────────────────────────

export const SIMS = [
  {
    id: 'projectile',
    name: 'Projectile Motion',
    tagline: 'Launch angles & parabolic paths',
    status: 'active',
  },
  {
    id: 'pendulum',
    name: 'Pendulum',
    tagline: 'Simple harmonic motion',
    status: 'active',
  },
  {
    id: 'orbits',
    name: 'Orbital Mechanics',
    tagline: 'Gravity & circular orbits',
    status: 'active',
  },
  {
    id: 'collisions',
    name: 'Collisions',
    tagline: 'Momentum & energy transfer',
    status: 'active',
  },
];
