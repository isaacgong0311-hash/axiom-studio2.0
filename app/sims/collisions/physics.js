// 1D collision physics — G = 0, just Newton + restitution.

// Post-collision velocities from coefficient of restitution e (0 = sticky, 1 = elastic).
// Momentum is always conserved; KE is conserved only when e = 1.
export function postCollisionVelocities(m1, v1, m2, v2, e) {
  const M = m1 + m2;
  return {
    v1new: ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / M,
    v2new: ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / M,
  };
}

export function kineticEnergy(m, v) {
  return 0.5 * m * v * v;
}

// Radius scales with sqrt(mass) so heavier balls look clearly bigger.
export function ballRadius(mass) {
  return 10 + Math.sqrt(Math.max(mass, 0.1)) * 5;
}
