// Pure physics functions — no React here, just math.
// All units are SI: meters, seconds, m/s, degrees.
// Every function accepts `g` (gravity in m/s²) — defaults to Earth (9.8).

const G_EARTH = 9.8;

// ── Analytic (vacuum) model ──────────────────────────────────
// Closed-form solutions for drag-free projectile motion. Fast and
// exact, used for the live readouts and the "ideal" ghost curve.

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

// ── Position at time t (vacuum) ──────────────────────────────
export function positionAt(angleDeg, speedMs, t, g = G_EARTH) {
  const rad = (angleDeg * Math.PI) / 180;
  const vx  = speedMs * Math.cos(rad);
  const vy  = speedMs * Math.sin(rad);
  return {
    x: vx * t,
    y: Math.max(0, vy * t - 0.5 * g * t * t),
  };
}

// ── Velocity components at time t (vacuum) ───────────────────
// vx is constant; vy decreases due to gravity then goes negative (falling).
export function velocityAt(angleDeg, speedMs, t, g = G_EARTH) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    vx: speedMs * Math.cos(rad),
    vy: speedMs * Math.sin(rad) - g * t,
  };
}

// ── Full vacuum trajectory as a list of points ───────────────
export function trajectoryPoints(angleDeg, speedMs, g = G_EARTH, steps = 120) {
  const { timeOfFlight: T } = calcReadouts(angleDeg, speedMs, g);
  if (T <= 0) return [{ x: 0, y: 0 }];
  return Array.from({ length: steps + 1 }, (_, i) =>
    positionAt(angleDeg, speedMs, (i / steps) * T, g)
  );
}

// ── Numerical (drag-aware) model ─────────────────────────────
// With quadratic air resistance there is NO closed-form solution, so we
// integrate the equations of motion numerically. We use classic 4th-order
// Runge–Kutta (RK4), which has O(dt⁴) local error — far more accurate than
// Euler for the same step size, so the curve stays stable even with strong
// drag and large steps.
//
// State vector:  s = [x, y, vx, vy]
// Acceleration with quadratic drag (force ∝ v², opposing motion):
//   a = -g·ĵ − k·|v|·v        where k is the drag coefficient per unit mass
// Setting k = 0 recovers the exact vacuum solution — this is what the unit
// test checks (RK4 with k→0 must converge to the analytic answer).

function derivative(state, g, k) {
  const [, , vx, vy] = state;
  const speed = Math.hypot(vx, vy);
  return [
    vx,                       // dx/dt
    vy,                       // dy/dt
    -k * speed * vx,          // dvx/dt
    -g - k * speed * vy,      // dvy/dt
  ];
}

function rk4Step(state, g, k, dt) {
  const add = (s, d, h) => s.map((v, i) => v + d[i] * h);
  const k1 = derivative(state, g, k);
  const k2 = derivative(add(state, k1, dt / 2), g, k);
  const k3 = derivative(add(state, k2, dt / 2), g, k);
  const k4 = derivative(add(state, k3, dt), g, k);
  return state.map(
    (v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  );
}

// Integrate flight from launch until the projectile returns to y = 0.
// Returns time-stamped samples plus derived readouts. Works for any drag,
// including drag = 0 (which reproduces the analytic model).
export function integrateTrajectory(angleDeg, speedMs, g = G_EARTH, drag = 0, opts = {}) {
  const { dt = 0.004, maxT = 60 } = opts;
  const rad = (angleDeg * Math.PI) / 180;

  let state = [0, 0, speedMs * Math.cos(rad), speedMs * Math.sin(rad)];
  const samples = [{ t: 0, x: 0, y: 0, vx: state[2], vy: state[3] }];

  // Degenerate launch (no upward component) — nothing to integrate.
  if (state[3] <= 0) {
    return { samples, range: 0, maxHeight: 0, timeOfFlight: 0, landingSpeed: 0 };
  }

  let t = 0, maxHeight = 0;
  while (t < maxT) {
    const next = rk4Step(state, g, drag, dt);
    const nt = t + dt;

    // Crossed the ground this step → linearly interpolate the exact landing.
    if (next[1] <= 0 && state[1] >= 0 && t > 0) {
      const frac = state[1] / (state[1] - next[1]); // 0..1 between samples
      const land = state.map((v, i) => v + (next[i] - v) * frac);
      const lt   = t + dt * frac;
      samples.push({ t: lt, x: land[0], y: 0, vx: land[2], vy: land[3] });
      return {
        samples,
        range:        Math.max(0, land[0]),
        maxHeight,
        timeOfFlight: lt,
        landingSpeed: Math.hypot(land[2], land[3]),
      };
    }

    state = next;
    t = nt;
    if (state[1] > maxHeight) maxHeight = state[1];
    samples.push({ t, x: state[0], y: state[1], vx: state[2], vy: state[3] });
  }

  const last = state;
  return {
    samples,
    range:        Math.max(0, last[0]),
    maxHeight,
    timeOfFlight: t,
    landingSpeed: Math.hypot(last[2], last[3]),
  };
}

// Sample an integrated trajectory at an arbitrary time via linear
// interpolation between the nearest stored steps. Used by the renderer to
// place the ball smoothly regardless of the integration step size.
export function sampleAt(samples, t) {
  if (samples.length === 0) return { x: 0, y: 0, vx: 0, vy: 0 };
  if (t <= 0) return samples[0];
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;

  // Binary search for the bracketing pair (samples are sorted by t).
  let lo = 0, hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi];
  const span = b.t - a.t || 1;
  const f = (t - a.t) / span;
  return {
    x:  a.x  + (b.x  - a.x)  * f,
    y:  a.y  + (b.y  - a.y)  * f,
    vx: a.vx + (b.vx - a.vx) * f,
    vy: a.vy + (b.vy - a.vy) * f,
  };
}
