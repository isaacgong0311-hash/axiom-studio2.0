// Pure physics functions — no React here, just math.
// All units are SI: meters, seconds, m/s, degrees.
// Every function accepts `g` (gravity in m/s²) — defaults to Earth (9.8).

const G_EARTH = 9.8;

// ── Core readouts ────────────────────────────────────────────
export function calcReadouts(angleDeg, speedMs, g = G_EARTH) {
  const rad = (angleDeg * Math.PI) / 180;
  const vx  = speedMs * Math.cos(rad);
  const vy  = speedMs * Math.sin(rad);

  const timeOfFlight = vy > 0 ? (2 * vy) / g : 0;
  const range        = vx * timeOfFlight;
  const maxHeight    = vy > 0 ? (vy * vy) / (2 * g) : 0;

  return {
    range:         Math.max(0, range),
    maxHeight:     Math.max(0, maxHeight),
    timeOfFlight:  Math.max(0, timeOfFlight),
  };
}

// ── Position at time t ───────────────────────────────────────
export function positionAt(angleDeg, speedMs, t, g = G_EARTH) {
  const rad = (angleDeg * Math.PI) / 180;
  const vx  = speedMs * Math.cos(rad);
  const vy  = speedMs * Math.sin(rad);
  return {
    x: vx * t,
    y: Math.max(0, vy * t - 0.5 * g * t * t),
  };
}

// ── Velocity components at time t ───────────────────────────
// vx is constant; vy decreases due to gravity then goes negative (falling).
export function velocityAt(angleDeg, speedMs, t, g = G_EARTH) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    vx: speedMs * Math.cos(rad),
    vy: speedMs * Math.sin(rad) - g * t,
  };
}

// ── Full trajectory as a list of points ─────────────────────
export function trajectoryPoints(angleDeg, speedMs, g = G_EARTH, steps = 120) {
  const { timeOfFlight: T } = calcReadouts(angleDeg, speedMs, g);
  if (T <= 0) return [{ x: 0, y: 0 }];
  return Array.from({ length: steps + 1 }, (_, i) =>
    positionAt(angleDeg, speedMs, (i / steps) * T, g)
  );
}
