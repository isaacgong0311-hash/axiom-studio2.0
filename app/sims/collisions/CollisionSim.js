'use client';

import { useEffect, useRef, useState } from 'react';
import { postCollisionVelocities, kineticEnergy, ballRadius } from './physics';
import TutorPanel from '../../components/TutorPanel';
import { useSimChallenges } from '../../hooks/useSimChallenges';
import { useScenario } from '../../contexts/ScenarioContext';
import { SCENARIOS }   from '../scenarios';

// ── Canvas geometry ───────────────────────────────────────────
const CW = 700, CH = 400;
const TRACK_Y  = 220;          // slightly below centre — room for arrows above
const SCALE    = 20;           // canvas px per physical metre
const START_M  = 10;           // balls start ±10 m from centre
const VEC_SCALE = 7;           // canvas px per m/s for velocity arrows

// ── Elasticity presets ────────────────────────────────────────
const EPRESETS = [
  { id: 'elastic', label: 'Elastic',  e: 1.0  },
  { id: 'soft',    label: 'Soft',     e: 0.6  },
  { id: 'sticky',  label: 'Sticky',   e: 0.0  },
  { id: 'custom',  label: 'Custom',   e: null },
];

function toCanvasX(physX) { return CW / 2 + physX * SCALE; }
function toPhysX(cx)      { return (cx - CW / 2) / SCALE; }

// ── Arrow helper ──────────────────────────────────────────────
function drawArrow(ctx, x1, y1, x2, y2, color) {
  const dx = x2-x1, dy = y2-y1;
  const mag = Math.hypot(dx, dy);
  if (mag < 5) return;
  const hl = Math.min(9, mag * 0.38);
  const a  = Math.atan2(dy, dx);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - hl*Math.cos(a-Math.PI/6), y2 - hl*Math.sin(a-Math.PI/6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl*Math.cos(a+Math.PI/6), y2 - hl*Math.sin(a+Math.PI/6));
  ctx.stroke();
}

// ── 3D ball drawing (matches projectile/pendulum style) ───────
function drawBall(ctx, cx, cy, r, color1, color2, colorDark) {
  // Ambient glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = `${color1}20`;
  ctx.fill();

  // Radial gradient — highlight offset top-left
  const grad = ctx.createRadialGradient(cx - r*0.32, cy - r*0.32, r*0.05, cx, cy, r);
  grad.addColorStop(0,    'rgba(255,255,255,0.9)');
  grad.addColorStop(0.18, color1);
  grad.addColorStop(0.55, color2);
  grad.addColorStop(1,    colorDark);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// ── Full frame painter (pure function) ────────────────────────
function paintFrame(ctx, {
  cx1, cx2, r1, r2,
  v1, v2,          // current velocities (for arrow direction/length)
  mass1, mass2,
  flash,           // { alpha, cx } or null
}) {
  // Background
  ctx.fillStyle = '#131318';
  ctx.fillRect(0, 0, CW, CH);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let x = 60; x < CW; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke(); }
  for (let y = 40; y < CH; y += 55) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y);  ctx.stroke(); }

  // Track
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, TRACK_Y); ctx.lineTo(CW-30, TRACK_Y); ctx.stroke();

  // Tick marks
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for (let x = 30; x <= CW-30; x += SCALE) {
    ctx.beginPath(); ctx.moveTo(x, TRACK_Y-4); ctx.lineTo(x, TRACK_Y+4); ctx.stroke();
  }

  // Centre-of-mass indicator (diamond above track)
  const xcm = (mass1 * toPhysX(cx1) + mass2 * toPhysX(cx2)) / (mass1 + mass2);
  const cmCx = toCanvasX(xcm);
  const cmY  = TRACK_Y - 52;
  ctx.fillStyle = 'rgba(251,191,36,0.5)';
  ctx.beginPath();
  ctx.moveTo(cmCx, cmY - 6); ctx.lineTo(cmCx+5, cmY);
  ctx.lineTo(cmCx, cmY + 6); ctx.lineTo(cmCx-5, cmY); ctx.closePath(); ctx.fill();
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(251,191,36,0.45)';
  ctx.textAlign = 'center';
  ctx.fillText('CM', cmCx, cmY - 9);

  // Collision flash ring
  if (flash && flash.alpha > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${flash.alpha.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(flash.cx, TRACK_Y, r1 + r2 + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ball shadows (on track surface)
  for (const [cx, r] of [[cx1, r1], [cx2, r2]]) {
    ctx.beginPath();
    ctx.ellipse(cx, TRACK_Y + 4, r * 0.75, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
  }

  // Balls
  drawBall(ctx, cx1, TRACK_Y, r1, '#c4c2ff', '#6d6af8', '#2a2870'); // indigo
  drawBall(ctx, cx2, TRACK_Y, r2, '#b0f0f8', '#22d3ee', '#0a5060'); // cyan

  // Velocity arrows
  if (Math.abs(v1) > 0.05) {
    const arrowY = TRACK_Y - r1 - 14;
    drawArrow(ctx, cx1, arrowY, cx1 + v1 * VEC_SCALE, arrowY, '#6d6af8');
  }
  if (Math.abs(v2) > 0.05) {
    const arrowY = TRACK_Y - r2 - 14;
    drawArrow(ctx, cx2, arrowY, cx2 + v2 * VEC_SCALE, arrowY, '#22d3ee');
  }

  // Ball labels
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(109,106,248,0.65)';
  ctx.fillText(`Ball 1 · ${mass1} kg`, cx1, TRACK_Y + r1 + 16);
  ctx.fillStyle = 'rgba(34,211,238,0.65)';
  ctx.fillText(`Ball 2 · ${mass2} kg`, cx2, TRACK_Y + r2 + 16);
  ctx.textAlign = 'left';
}

// ── Toggle switch (same as other sims) ────────────────────────
function Toggle({ label, on, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <button onClick={onChange} style={{
        position: 'relative', flexShrink: 0, width: 36, height: 20,
        borderRadius: 10, cursor: 'pointer',
        background: on ? 'var(--accent)' : 'var(--bg-muted)',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s', left: on ? 18 : 2,
        }} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function CollisionSim() {
  const canvasRef = useRef(null);

  // Controls
  const [mass1,   setMass1]   = useState(2);
  const [mass2,   setMass2]   = useState(2);
  const [vel1,    setVel1]    = useState(5);    // m/s, + = rightward
  const [vel2,    setVel2]    = useState(-5);
  const [e,       setE]       = useState(1.0);
  const [ePreset, setEPreset] = useState('elastic');
  const [launched, setLaunched] = useState(false);

  // Result state (populated on collision)
  const [afterVels, setAfterVels] = useState(null);

  // Derived pre-collision readouts (update live as sliders move)
  const r1 = ballRadius(mass1);
  const r2 = ballRadius(mass2);
  const p_total  = mass1 * vel1 + mass2 * vel2;
  const ke_total = kineticEnergy(mass1, vel1) + kineticEnergy(mass2, vel2);

  function handleReset() {
    setLaunched(false);
    setAfterVels(null);
  }

  function handleEPreset(preset) {
    setEPreset(preset.id);
    if (preset.e !== null) setE(preset.e);
  }

  // ── Scenario subscription ────────────────────────────────
  const { pendingScenario, clearScenario } = useScenario();
  useEffect(() => {
    if (!pendingScenario) return;
    const s = SCENARIOS[pendingScenario];
    if (!s || s.simId !== 'collisions') return;
    const v = s.values;
    if (v.mass1   !== undefined) setMass1(v.mass1);
    if (v.mass2   !== undefined) setMass2(v.mass2);
    if (v.vel1    !== undefined) setVel1(v.vel1);
    if (v.vel2    !== undefined) setVel2(v.vel2);
    if (v.e       !== undefined) setE(v.e);
    if (v.ePreset !== undefined) setEPreset(v.ePreset);
    setLaunched(false); setAfterVels(null);
    clearScenario();
  }, [pendingScenario, clearScenario]);

  // ── Canvas effect ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const r1 = ballRadius(mass1);
    const r2 = ballRadius(mass2);

    const staticArgs = {
      cx1: toCanvasX(-START_M), cx2: toCanvasX(+START_M),
      r1, r2, v1: vel1, v2: vel2, mass1, mass2, flash: null,
    };

    if (!launched) {
      paintFrame(ctx, staticArgs);
      return;
    }

    // ── Running animation ─────────────────────────────────
    let physX1 = -START_M, physX2 = +START_M;
    let curV1 = vel1, curV2 = vel2;
    let hasCollided = false;
    let flash = null;
    let lastTs = null, rafId;

    function step(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      physX1 += curV1 * dt;
      physX2 += curV2 * dt;

      // ── Collision detection (physical coords) ──────────
      const r1Phys = r1 / SCALE;
      const r2Phys = r2 / SCALE;
      const gap = physX2 - physX1;

      if (!hasCollided && gap <= r1Phys + r2Phys && curV1 > curV2) {
        // Snap to touching (share the overlap symmetrically)
        const overlap = (r1Phys + r2Phys) - gap;
        physX1 -= overlap / 2;
        physX2 += overlap / 2;

        const { v1new, v2new } = postCollisionVelocities(mass1, curV1, mass2, curV2, e);
        curV1 = v1new;
        curV2 = v2new;
        hasCollided = true;
        flash = { alpha: 0.85, cx: toCanvasX((physX1 + physX2) / 2) };
        setAfterVels({ v1: v1new, v2: v2new });
      }

      // Fade flash
      if (flash) flash.alpha = Math.max(0, flash.alpha - dt * 1.8);

      paintFrame(ctx, {
        cx1: toCanvasX(physX1), cx2: toCanvasX(physX2),
        r1, r2, v1: curV1, v2: curV2,
        mass1, mass2, flash,
      });

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [mass1, mass2, vel1, vel2, e, launched]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Readout helpers ───────────────────────────────────────
  const velFmt  = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} m/s`;
  const numFmt  = (n, unit) => `${n >= 0 ? '+' : ''}${n.toFixed(3)} ${unit}`;
  const ke_after = afterVels
    ? kineticEnergy(mass1, afterVels.v1) + kineticEnergy(mass2, afterVels.v2)
    : null;
  const ke_delta = ke_after !== null ? ke_after - ke_total : null;
  const p_after  = afterVels
    ? mass1 * afterVels.v1 + mass2 * afterVels.v2
    : null;

  // ── Challenge detection ───────────────────────────────────
  useSimChallenges('collisions', {
    collided: afterVels !== null,
    e,
    mass1,
    mass2,
    vel2,
    v1After: afterVels?.v1 ?? null,
  });

  // ── JSX ───────────────────────────────────────────────────
  const simState = {
    simId:         'collisions',
    ball1Mass:     `${mass1} kg`,
    ball1Velocity: `${vel1 >= 0 ? '+' : ''}${vel1} m/s`,
    ball2Mass:     `${mass2} kg`,
    ball2Velocity: `${vel2 >= 0 ? '+' : ''}${vel2} m/s`,
    elasticity:    `e = ${e.toFixed(1)} (${ePreset})`,
    momentumBefore: `${p_total.toFixed(2)} kg·m/s`,
    keBefore:      `${ke_total.toFixed(2)} J`,
    ...(afterVels ? {
      ball1After:    `${afterVels.v1 >= 0 ? '+' : ''}${afterVels.v1.toFixed(2)} m/s`,
      ball2After:    `${afterVels.v2 >= 0 ? '+' : ''}${afterVels.v2.toFixed(2)} m/s`,
      momentumAfter: `${(p_after ?? 0).toFixed(2)} kg·m/s`,
      keAfter:       `${(kineticEnergy(mass1, afterVels.v1) + kineticEnergy(mass2, afterVels.v2)).toFixed(2)} J`,
    } : { collisionOccurred: 'not yet' }),
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

          <div className="space-y-4">
            {/* Mass 1 */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  <span style={{ color: '#6d6af8' }}>●</span> Ball 1 mass
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{mass1} kg</span>
              </div>
              <input type="range" min={1} max={10} step={0.5} value={mass1}
                disabled={launched}
                onChange={(e) => { setMass1(Number(e.target.value)); setLaunched(false); setAfterVels(null); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
            </div>

            {/* Mass 2 */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  <span style={{ color: '#22d3ee' }}>●</span> Ball 2 mass
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{mass2} kg</span>
              </div>
              <input type="range" min={1} max={10} step={0.5} value={mass2}
                disabled={launched}
                onChange={(e) => { setMass2(Number(e.target.value)); setLaunched(false); setAfterVels(null); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
            </div>

            {/* Velocity 1 */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  <span style={{ color: '#6d6af8' }}>●</span> Ball 1 velocity
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>
                  {vel1 >= 0 ? '+' : ''}{vel1.toFixed(1)} m/s {vel1 >= 0 ? '→' : '←'}
                </span>
              </div>
              <input type="range" min={-10} max={10} step={0.5} value={vel1}
                disabled={launched}
                onChange={(e) => { setVel1(Number(e.target.value)); setLaunched(false); setAfterVels(null); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>← −10</span><span>+10 →</span>
              </div>
            </div>

            {/* Velocity 2 */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  <span style={{ color: '#22d3ee' }}>●</span> Ball 2 velocity
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>
                  {vel2 >= 0 ? '+' : ''}{vel2.toFixed(1)} m/s {vel2 >= 0 ? '→' : '←'}
                </span>
              </div>
              <input type="range" min={-10} max={10} step={0.5} value={vel2}
                disabled={launched}
                onChange={(e) => { setVel2(Number(e.target.value)); setLaunched(false); setAfterVels(null); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>← −10</span><span>+10 →</span>
              </div>
            </div>

            {/* Elasticity presets */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Elasticity
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {EPRESETS.map((p) => (
                  <button key={p.id}
                    onClick={() => handleEPreset(p)}
                    className="py-1.5 rounded-lg text-xs border transition-colors"
                    style={{
                      background:  ePreset === p.id ? 'var(--accent)' : 'transparent',
                      color:       ePreset === p.id ? '#fff' : 'var(--text-muted)',
                      borderColor: ePreset === p.id ? 'var(--accent)' : 'var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {p.id !== 'custom' ? `${p.label} ${p.e}` : 'Custom'}
                  </button>
                ))}
              </div>

              {ePreset === 'custom' && (
                <div className="mt-3">
                  <div className="flex justify-between mb-1 text-sm">
                    <span style={{ color: 'var(--text)' }}>Coefficient (e)</span>
                    <span className="font-mono" style={{ color: 'var(--accent)' }}>{e.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={e}
                    onChange={(evt) => setE(Number(evt.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>0 (sticky)</span><span>1 (elastic)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Readouts ── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Readouts
          </p>

          {/* Before */}
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Before</p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Total momentum</span>
              <span className="font-mono" style={{ color: 'var(--text)' }}>
                {numFmt(p_total, 'kg·m/s')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Total KE</span>
              <span className="font-mono" style={{ color: 'var(--text)' }}>
                {ke_total.toFixed(3)} J
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

          {/* After */}
          <p className="text-xs font-medium mb-2" style={{ color: afterVels ? 'var(--text-muted)' : 'var(--border)' }}>
            After
          </p>
          <div className="space-y-2">
            {/* Ball velocities */}
            {[
              { label: 'Ball 1 velocity', v: afterVels?.v1, color: '#6d6af8' },
              { label: 'Ball 2 velocity', v: afterVels?.v2, color: '#22d3ee' },
            ].map(({ label, v, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono" style={{ color: v !== undefined ? color : 'var(--border)' }}>
                  {v !== undefined ? velFmt(v) : '—'}
                </span>
              </div>
            ))}

            {/* Momentum (always conserved) */}
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Total momentum</span>
              <span className="font-mono" style={{ color: p_after !== null ? '#4ade80' : 'var(--border)' }}>
                {p_after !== null
                  ? `${numFmt(p_after, '')} ✓`
                  : '—'}
              </span>
            </div>

            {/* KE */}
            <div className="flex justify-between text-sm items-start">
              <span style={{ color: 'var(--text-muted)' }}>Total KE</span>
              <span className="font-mono text-right" style={{
                color: ke_after !== null
                  ? (Math.abs(ke_delta) < 0.001 ? '#4ade80' : '#fbbf24')
                  : 'var(--border)',
              }}>
                {ke_after !== null
                  ? ke_delta !== null && Math.abs(ke_delta) < 0.001
                    ? `${ke_after.toFixed(3)} J ✓`
                    : `${ke_after.toFixed(3)} J\n(${ke_delta.toFixed(2)} J)`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3">
          <button
            onClick={() => setLaunched(true)}
            disabled={launched}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--accent)', color: '#fff',
              opacity: launched ? 0.4 : 1,
              cursor: launched ? 'not-allowed' : 'pointer',
            }}
          >
            Start
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>

        {/* CM hint */}
        <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.55 }}>
          ◆ Centre of mass moves at constant velocity — it never accelerates.
        </p>

      </div>
    </div>

    <TutorPanel
      simId="collisions"
      simState={simState}
      hasResult={launched}
      rawState={{ collided: afterVels !== null, e }}
    />
    </div>
  );
}
