'use client';

import { useEffect, useRef, useState } from 'react';
import { calcPeriod, rk4Step, calcEnergy, PLANETS } from './physics';
import TutorPanel from '../../components/TutorPanel';
import { useSimChallenges } from '../../hooks/useSimChallenges';
import { useScenario } from '../../contexts/ScenarioContext';
import { SCENARIOS }   from '../scenarios';

// ── Canvas geometry ───────────────────────────────────────────
const CW = 700, CH = 400;
const PIVOT_X = CW / 2;
const PIVOT_Y = 62;
const BOB_R   = 13;
const MAX_TRAIL   = 220;
const DAMPING_B   = 0.18;  // underdamped — oscillates and slowly stops
const VEC_SCALE   = 28;    // canvas px per m/s for velocity arrow

// ── Canvas helpers (pure — no React) ─────────────────────────

// Rod length in canvas pixels, scaled so the pendulum always fits.
function getScale(len) {
  return Math.min(230, 260 / Math.max(len, 0.1));
}

function getBobPos(theta, len) {
  const rodPx = len * getScale(len);
  return {
    bx: PIVOT_X + rodPx * Math.sin(theta),
    by: PIVOT_Y + rodPx * Math.cos(theta),
    rodPx,
  };
}

function drawArrow(ctx, x1, y1, x2, y2, color, label) {
  const dx = x2 - x1, dy = y2 - y1;
  const mag = Math.hypot(dx, dy);
  if (mag < 6) return;
  const headLen = Math.min(10, mag * 0.35);
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
    ctx.fillText(label, x2 + Math.cos(ang) * 14, y2 + Math.sin(ang) * 14 + 4);
    ctx.textAlign = 'left';
  }
}

// Standalone frame painter — takes everything it needs explicitly.
function paintFrame(ctx, { theta, omega, length, startAngleDeg, trail, showVectors }) {
  const { bx, by, rodPx } = getBobPos(theta, length);
  const startAngleRad = startAngleDeg * Math.PI / 180;

  // ── Background ──────────────────────────────────────────
  ctx.fillStyle = '#131318';
  ctx.fillRect(0, 0, CW, CH);

  // ── Grid ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 60; x < CW; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }
  for (let y = 40; y < CH; y += 55) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }

  // ── Ceiling bracket ──────────────────────────────────────
  ctx.fillStyle = 'rgba(220,220,255,0.1)';
  ctx.fillRect(PIVOT_X - 32, PIVOT_Y - 22, 64, 8);   // horizontal bar
  ctx.fillRect(PIVOT_X - 2,  PIVOT_Y - 14, 4,  16);  // vertical pin support
  // Hatch marks on ceiling bar
  ctx.strokeStyle = 'rgba(220,220,255,0.08)';
  ctx.lineWidth = 1.5;
  for (let i = -24; i <= 24; i += 10) {
    ctx.beginPath();
    ctx.moveTo(PIVOT_X + i - 4, PIVOT_Y - 22);
    ctx.lineTo(PIVOT_X + i + 2, PIVOT_Y - 14);
    ctx.stroke();
  }

  // ── Swing arc guide (shows range of motion) ─────────────
  // In canvas coords, "straight down" = π/2.
  // Left extreme (−θ₀) → canvas angle π/2 + θ₀; right extreme (+θ₀) → π/2 − θ₀.
  // Anticlockwise from π/2+θ₀ to π/2−θ₀ passes through π/2 (bottom). ✓
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(109,106,248,0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(
    PIVOT_X, PIVOT_Y, rodPx,
    Math.PI / 2 + startAngleRad,
    Math.PI / 2 - startAngleRad,
    true,
  );
  ctx.stroke();
  ctx.setLineDash([]);

  // Tiny end-stop dots at the extremes
  ctx.fillStyle = 'rgba(109,106,248,0.3)';
  const lx = PIVOT_X - rodPx * Math.sin(startAngleRad);
  const ly = PIVOT_Y + rodPx * Math.cos(startAngleRad);
  const rx = PIVOT_X + rodPx * Math.sin(startAngleRad);
  const ry = ly;
  ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();

  // ── Trail (fading path of bob positions) ─────────────────
  if (trail.length >= 2) {
    const groups = 14;
    for (let g = 0; g < groups; g++) {
      const s = Math.floor((g / groups) * (trail.length - 1));
      const e = Math.floor(((g + 1) / groups) * (trail.length - 1));
      if (s >= e) continue;
      const alpha = ((g + 1) / groups) * 0.38;
      ctx.strokeStyle = `rgba(109,106,248,${alpha.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = s; i <= e; i++) {
        i === s ? ctx.moveTo(trail[i].x, trail[i].y) : ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }
  }

  // ── Rod ─────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(220,220,240,0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PIVOT_X, PIVOT_Y);
  ctx.lineTo(bx, by);
  ctx.stroke();

  // ── Pivot pin ────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(PIVOT_X, PIVOT_Y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220,220,240,0.55)';
  ctx.fill();

  // ── Shadow (below bob, at equilibrium height) ─────────────
  const bottomY  = PIVOT_Y + rodPx;
  const heightAbove = bottomY - by;
  const hFrac = Math.min(1, heightAbove / (rodPx + 0.001));
  const shadowAlpha = 0.32 * (1 - hFrac * 0.85);
  ctx.beginPath();
  ctx.ellipse(bx, bottomY, BOB_R * (1 - hFrac * 0.45) * 1.7, 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(2)})`;
  ctx.fill();

  // ── Bob ambient glow ─────────────────────────────────────
  ctx.beginPath();
  ctx.arc(bx, by, BOB_R + 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(109,106,248,0.1)';
  ctx.fill();

  // ── Bob — 3D radial gradient (matches projectile ball) ───
  const hlx  = bx - BOB_R * 0.33;
  const hly  = by - BOB_R * 0.33;
  const grad = ctx.createRadialGradient(hlx, hly, BOB_R * 0.05, bx, by, BOB_R);
  grad.addColorStop(0,    'rgba(255,255,255,0.9)');
  grad.addColorStop(0.18, '#c4c2ff');
  grad.addColorStop(0.55, '#6d6af8');
  grad.addColorStop(1,    '#2a2870');
  ctx.beginPath();
  ctx.arc(bx, by, BOB_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Velocity vector ───────────────────────────────────────
  if (showVectors && Math.abs(omega) > 0.005) {
    // Tangential velocity in canvas coords:
    //   vx = ω·L·cos(θ),  vy = −ω·L·sin(θ)   (m/s, in canvas direction)
    const vms = omega * length;
    const dvx = vms * Math.cos(theta) * VEC_SCALE;
    const dvy = -vms * Math.sin(theta) * VEC_SCALE;
    drawArrow(ctx, bx, by, bx + dvx, by + dvy, '#22d3ee', 'v');
  }
}

// ── Toggle switch ─────────────────────────────────────────────
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
          cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: on ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

// ── Energy bars ───────────────────────────────────────────────
function EnergyBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {value.toFixed(3)} J
        </span>
      </div>
      <div style={{ background: 'var(--bg-muted)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PendulumSim() {
  const canvasRef = useRef(null);

  // Controls
  const [length,     setLength]     = useState(1.0);
  const [startAngle, setStartAngle] = useState(30);
  const [gravity,    setGravity]    = useState(9.8);
  const [gravPreset, setGravPreset] = useState('earth');
  const [running,    setRunning]    = useState(false);
  const [hasRun,     setHasRun]     = useState(false);  // true once pendulum has been released

  // Toggles — state for UI, refs for animation loop
  const [damping,     setDamping]     = useState(false);
  const [showVectors, setShowVectors] = useState(false);
  const dampingRef     = useRef(false);
  const showVectorsRef = useRef(false);

  // Live physics refs (animation loop reads/writes these)
  const thetaRef = useRef(startAngle * Math.PI / 180);
  const omegaRef = useRef(0);
  const trailRef = useRef([]);
  const initEnergyRef = useRef(null); // set when animation starts

  // Readout state — updated every frame by animation loop
  const [liveAngle,  setLiveAngle]  = useState(startAngle);
  const [liveSpeed,  setLiveSpeed]  = useState(0);
  const [liveEnergy, setLiveEnergy] = useState({ KE: 0, PE: 0, total: 0 });

  const period = calcPeriod(length, gravity);

  // ── Handlers ────────────────────────────────────────────
  function handleReset() {
    setRunning(false);
    setHasRun(false);
  }

  function handleGravityChange(newG, preset) {
    setGravity(newG);
    setGravPreset(preset);
    setRunning(false);
    setHasRun(false);
  }

  // Track that the pendulum has been released at least once (for tutor)
  useEffect(() => { if (running) setHasRun(true); }, [running]);

  function handleToggleDamping() {
    const next = !damping;
    setDamping(next);
    dampingRef.current = next;
  }

  function handleToggleVectors() {
    const next = !showVectors;
    setShowVectors(next);
    showVectorsRef.current = next;
  }

  // ── Scenario subscription ────────────────────────────────
  const { pendingScenario, clearScenario } = useScenario();
  useEffect(() => {
    if (!pendingScenario) return;
    const s = SCENARIOS[pendingScenario];
    if (!s || s.simId !== 'pendulum') return;
    const v = s.values;
    if (v.length     !== undefined) setLength(v.length);
    if (v.startAngle !== undefined) setStartAngle(v.startAngle);
    if (v.gravity    !== undefined) setGravity(v.gravity);
    if (v.gravPreset !== undefined) setGravPreset(v.gravPreset);
    setRunning(false); setHasRun(false);
    clearScenario();
  }, [pendingScenario, clearScenario]);

  // ── Static frame: draw when not running ─────────────────
  useEffect(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const theta = startAngle * Math.PI / 180;
    thetaRef.current = theta;
    omegaRef.current = 0;
    trailRef.current = [];

    const e = calcEnergy(theta, 0, length, gravity);
    initEnergyRef.current = Math.max(e.total, 1e-6);

    paintFrame(ctx, {
      theta, omega: 0, length, startAngleDeg: startAngle,
      trail: [], showVectors: showVectorsRef.current,
    });
    setLiveAngle(startAngle);
    setLiveSpeed(0);
    setLiveEnergy(e);
  }, [startAngle, length, gravity, running]);

  // ── Animation loop ───────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Snapshot initial energy for bar normalization
    const ie = calcEnergy(thetaRef.current, omegaRef.current, length, gravity);
    initEnergyRef.current = Math.max(ie.total, 1e-6);

    let lastTs = null;
    let rafId;

    function step(ts) {
      if (!lastTs) lastTs = ts;
      const rawDt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      // Sub-step RK4 for high accuracy (8× per frame ≈ 2ms steps at 60fps)
      const b   = dampingRef.current ? DAMPING_B : 0;
      const sub = 8;
      const dt  = rawDt / sub;
      let theta = thetaRef.current;
      let omega = omegaRef.current;
      for (let i = 0; i < sub; i++) {
        ({ theta, omega } = rk4Step(theta, omega, gravity, length, b, dt));
      }
      thetaRef.current = theta;
      omegaRef.current = omega;

      // Update trail
      const { bx, by } = getBobPos(theta, length);
      trailRef.current.push({ x: bx, y: by });
      if (trailRef.current.length > MAX_TRAIL) {
        trailRef.current.splice(0, trailRef.current.length - MAX_TRAIL);
      }

      paintFrame(ctx, {
        theta, omega, length, startAngleDeg: startAngle,
        trail: trailRef.current, showVectors: showVectorsRef.current,
      });

      const e = calcEnergy(theta, omega, length, gravity);
      setLiveAngle(theta * 180 / Math.PI);
      setLiveSpeed(Math.abs(omega * length));
      setLiveEnergy(e);

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [running, length, gravity, startAngle]);

  // ── Challenge detection ───────────────────────────────────
  useSimChallenges('pendulum', { running, period, gravity });

  // ── JSX ──────────────────────────────────────────────────
  const simState = {
    simId:         'pendulum',
    length:        `${length} m`,
    startAngle:    `${startAngle}°`,
    gravity:       `${gravity.toFixed(1)} m/s²`,
    period:        `${period.toFixed(3)} s`,
    damping:       damping ? 'on' : 'off',
    running:       running ? 'yes' : 'no',
    liveAngle:     `${liveAngle.toFixed(1)}°`,
    liveSpeed:     `${liveSpeed.toFixed(3)} m/s`,
    kineticEnergy: `${liveEnergy.KE.toFixed(3)} J`,
    potentialEnergy:`${liveEnergy.PE.toFixed(3)} J`,
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

        {/* ── Controls ── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Controls
          </p>

          <div className="space-y-5">
            {/* Length */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Length</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{length.toFixed(2)} m</span>
              </div>
              <input type="range" min={0.3} max={3} step={0.05} value={length}
                disabled={running}
                onChange={(e) => { setLength(Number(e.target.value)); setRunning(false); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: running ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>0.3 m</span><span>3 m</span>
              </div>
            </div>

            {/* Start angle */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Starting angle</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{startAngle}°</span>
              </div>
              <input type="range" min={3} max={80} value={startAngle}
                disabled={running}
                onChange={(e) => { setStartAngle(Number(e.target.value)); setRunning(false); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: running ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>3°</span><span>80°</span>
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
                    background:  gravPreset === p.id ? 'var(--accent)' : 'transparent',
                    color:       gravPreset === p.id ? '#fff' : 'var(--text-muted)',
                    borderColor: gravPreset === p.id ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {p.id !== 'custom' ? `${p.label} ${p.g}` : 'Custom'}
                </button>
              ))}
            </div>

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

        {/* ── Options ── */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Options
          </p>
          <Toggle label="Damping (friction)" on={damping}      onChange={handleToggleDamping} />
          <Toggle label="Velocity vector"    on={showVectors}  onChange={handleToggleVectors} />
        </div>

        {/* ── Readouts ── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Readouts
          </p>
          <div className="space-y-3.5">
            {[
              { label: 'Period (T = 2π√L/g)', value: period.toFixed(3), unit: 's' },
              { label: 'Current angle',        value: liveAngle.toFixed(1), unit: '°' },
              { label: 'Current speed',        value: liveSpeed.toFixed(3), unit: 'm/s' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                  {value}<span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>
                </span>
              </div>
            ))}

            {/* Energy bars */}
            <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Energy
              </p>
              <EnergyBar
                label="Kinetic"
                value={liveEnergy.KE}
                max={initEnergyRef.current ?? 1}
                color="#fbbf24"
              />
              <EnergyBar
                label="Potential"
                value={liveEnergy.PE}
                max={initEnergyRef.current ?? 1}
                color="var(--accent)"
              />
            </div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3">
          <button
            onClick={() => setRunning(true)}
            disabled={running}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: running ? 0.4 : 1, cursor: running ? 'not-allowed' : 'pointer' }}
          >
            Release
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>

      </div>
    </div>

    <TutorPanel
      simId="pendulum"
      simState={simState}
      hasResult={hasRun}
      rawState={{ running, period, gravity }}
    />
    </div>
  );
}
