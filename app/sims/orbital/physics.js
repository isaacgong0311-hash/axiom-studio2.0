// Orbital mechanics helpers — G = 1 (absorbed into star mass).
// All speeds are in simulation units/s, distances in sim units.

export function circularSpeed(starMass, distance) {
  return Math.sqrt(Math.max(starMass, 0) / Math.max(distance, 0.01));
}

export function escapeSpeed(starMass, distance) {
  return Math.sqrt(2 * Math.max(starMass, 0) / Math.max(distance, 0.01));
}

// Specific orbital energy (per unit mass). Negative = bound orbit.
export function orbitalEnergy(speed, distance, starMass) {
  return 0.5 * speed * speed - starMass / Math.max(distance, 0.01);
}
