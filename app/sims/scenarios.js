// Named scenarios — the finite set Axion can apply to sim controls.
// TutorPanel dispatches a scenario name; each sim reads it and applies these values.

export const SCENARIOS = {
  // ── Projectile Motion ──────────────────────────────────────────────────
  'proj-moon-shot': {
    simId:  'projectile',
    label:  'Moon Shot (45°)',
    values: { angle: 45, speed: 20, gravity: 1.6, gravPreset: 'moon' },
  },
  'proj-max-range': {
    simId:  'projectile',
    label:  '45° Earth Launch',
    values: { angle: 45, speed: 20, gravity: 9.8, gravPreset: 'earth' },
  },
  'proj-high-arc': {
    simId:  'projectile',
    label:  'High Arc (75°)',
    values: { angle: 75, speed: 20, gravity: 9.8, gravPreset: 'earth' },
  },

  // ── Pendulum ───────────────────────────────────────────────────────────
  'pend-seconds': {
    simId:  'pendulum',
    label:  'Seconds Pendulum (~2 s)',
    values: { length: 0.99, startAngle: 15, gravity: 9.8, gravPreset: 'earth' },
  },
  'pend-moon': {
    simId:  'pendulum',
    label:  'Moon Gravity Swing',
    values: { gravity: 1.6, gravPreset: 'moon' },
  },
  'pend-long': {
    simId:  'pendulum',
    label:  'Slow 4-Second Swing',
    values: { length: 3.97, startAngle: 20, gravity: 9.8, gravPreset: 'earth' },
  },

  // ── Orbital Mechanics ──────────────────────────────────────────────────
  // vCirc = sqrt(M/r) = sqrt(500/15) ≈ 5.77; vEsc = sqrt(2) * vCirc ≈ 8.16
  'orb-stable': {
    simId:  'orbits',
    label:  'Stable Circular Orbit',
    values: { starMass: 500, initialDistance: 15, initialSpeed: 5.77 },
  },
  'orb-escape': {
    simId:  'orbits',
    label:  'Escape Velocity',
    values: { starMass: 500, initialDistance: 15, initialSpeed: 8.5 },
  },
  'orb-crash': {
    simId:  'orbits',
    label:  'Crash Into Star',
    values: { starMass: 500, initialDistance: 15, initialSpeed: 2.0 },
  },

  // ── Collisions ─────────────────────────────────────────────────────────
  'col-elastic': {
    simId:  'collisions',
    label:  'Elastic Collision (e = 1)',
    values: { mass1: 2, mass2: 2, vel1: 5, vel2: -5, e: 1.0, ePreset: 'elastic' },
  },
  'col-inelastic': {
    simId:  'collisions',
    label:  'Sticky Collision (e = 0)',
    values: { mass1: 2, mass2: 2, vel1: 5, vel2: -5, e: 0.0, ePreset: 'sticky' },
  },
  'col-dead-stop': {
    simId:  'collisions',
    label:  'Dead Stop (equal masses, e = 1)',
    values: { mass1: 2, mass2: 2, vel1: 5, vel2: 0, e: 1.0, ePreset: 'elastic' },
  },
};
