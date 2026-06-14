// Pure pendulum physics. All units SI: meters, seconds, radians, m/s².
// Uses RK4 numerical integration — accurate at any starting angle.

const G_EARTH = 9.8;

export const PLANETS = [
  { id: 'earth',  label: 'Earth',  g: 9.8  },
  { id: 'moon',   label: 'Moon',   g: 1.6  },
  { id: 'mars',   label: 'Mars',   g: 3.7  },
  { id: 'custom', label: 'Custom', g: null },
];

// Small-angle approximation period (standard classroom formula).
// Exact period diverges at large angles; this is the taught formula.
export function calcPeriod(lengthM, g = G_EARTH) {
  if (g <= 0 || lengthM <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(lengthM / g);
}

// ODE derivatives: [dθ/dt, dω/dt]
// θ'' = -(g/L)·sin(θ) − b·ω  (b = damping coefficient)
function deriv(theta, omega, g, L, b) {
  return [omega, -(g / L) * Math.sin(theta) - b * omega];
}

// Single RK4 step — integrates the pendulum ODE by dt seconds.
export function rk4Step(theta, omega, g, L, b, dt) {
  const [k1t, k1w] = deriv(theta,              omega,              g, L, b);
  const [k2t, k2w] = deriv(theta + 0.5*dt*k1t, omega + 0.5*dt*k1w, g, L, b);
  const [k3t, k3w] = deriv(theta + 0.5*dt*k2t, omega + 0.5*dt*k2w, g, L, b);
  const [k4t, k4w] = deriv(theta +     dt*k3t,  omega +     dt*k3w,  g, L, b);
  return {
    theta: theta + (dt / 6) * (k1t + 2*k2t + 2*k3t + k4t),
    omega: omega + (dt / 6) * (k1w + 2*k2w + 2*k3w + k4w),
  };
}

// Kinetic + potential energy (mass = 1 kg, PE ref = lowest point).
export function calcEnergy(theta, omega, L, g) {
  const h  = L * (1 - Math.cos(theta)); // height above lowest point
  const v  = omega * L;                 // tangential speed
  const KE = 0.5 * v * v;
  const PE = g * h;
  return { KE, PE, total: KE + PE };
}
