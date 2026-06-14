'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { circularSpeed, escapeSpeed } from './physics';
import TutorPanel from '../../components/TutorPanel';
import { useSimChallenges } from '../../hooks/useSimChallenges';
import { useScenario } from '../../contexts/ScenarioContext';
import { SCENARIOS }   from '../scenarios';

// Three.js / WebGL must never run server-side.
const OrbitalCanvas = dynamic(() => import('./OrbitalCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#0a0a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#7b7fa8', fontSize: 13 }}>Initialising 3D scene…</span>
    </div>
  ),
});

// ── Status display config ─────────────────────────────────────
const STATUS_META = {
  ready:    { label: 'Ready',             color: 'var(--text-muted)', bg: 'transparent',              border: 'var(--border)'              },
  orbiting: { label: 'Orbiting',          color: '#4ade80',           bg: 'rgba(74,222,128,0.10)',     border: 'rgba(74,222,128,0.30)'      },
  escaping: { label: 'Escaping',          color: '#fb923c',           bg: 'rgba(251,146,60,0.10)',     border: 'rgba(251,146,60,0.30)'      },
  crashed:  { label: 'Crashed into star', color: '#f87171',           bg: 'rgba(248,113,113,0.10)',    border: 'rgba(248,113,113,0.30)'     },
  escaped:  { label: 'Escaped orbit',     color: '#a78bfa',           bg: 'rgba(167,139,250,0.10)',    border: 'rgba(167,139,250,0.30)'     },
};

export default function OrbitalSim() {
  // ── Controls state ───────────────────────────────────────
  const [starMass,         setStarMass]         = useState(500);
  const [initialDistance,  setInitialDistance]  = useState(15);
  const [initialSpeed,     setInitialSpeed]     = useState(5.8);
  const [running,          setRunning]          = useState(false);
  const [resetKey,         setResetKey]         = useState(0);

  // ── Live readout state (updated ~10fps from canvas) ──────
  const [liveSpeed,    setLiveSpeed]    = useState(5.8);
  const [liveDistance, setLiveDistance] = useState(15);
  const [status,       setStatus]       = useState('ready');

  // Orbital speed hints
  const vCirc = circularSpeed(starMass, initialDistance).toFixed(2);
  const vEsc  = escapeSpeed(starMass, initialDistance).toFixed(2);

  const handleUpdate = useCallback((speed, dist, stat) => {
    setLiveSpeed(speed);
    setLiveDistance(dist);
    setStatus(stat);
  }, []);

  function handleReset() {
    setRunning(false);
    setResetKey(k => k + 1);
    setLiveSpeed(initialSpeed);
    setLiveDistance(initialDistance);
    setStatus('ready');
  }

  // ── Scenario subscription ────────────────────────────────
  const { pendingScenario, clearScenario } = useScenario();
  useEffect(() => {
    if (!pendingScenario) return;
    const s = SCENARIOS[pendingScenario];
    if (!s || s.simId !== 'orbits') return;
    const v = s.values;
    if (v.starMass         !== undefined) setStarMass(v.starMass);
    if (v.initialDistance  !== undefined) { setInitialDistance(v.initialDistance); setLiveDistance(v.initialDistance); }
    if (v.initialSpeed     !== undefined) { setInitialSpeed(v.initialSpeed);    setLiveSpeed(v.initialSpeed); }
    setRunning(false); setResetKey(k => k + 1); setStatus('ready');
    clearScenario();
  }, [pendingScenario, clearScenario]);

  const canLaunch = !running && status !== 'crashed' && status !== 'escaped';
  const statusMeta = STATUS_META[status] ?? STATUS_META.ready;
  const { label: statusLabel, color: statusColor, bg: statusBg, border: statusBorder } = statusMeta;

  // ── Challenge detection ───────────────────────────────────
  useSimChallenges('orbits', { status });

  const simState = {
    simId:           'orbits',
    starMass,
    initialDistance: `${initialDistance} units`,
    initialSpeed:    `${initialSpeed} u/s`,
    circularSpeed:   `${vCirc} u/s`,
    escapeSpeed:     `${vEsc} u/s`,
    status,
    liveSpeed:       `${liveSpeed.toFixed(2)} u/s`,
    liveDistance:    `${liveDistance.toFixed(2)} units`,
  };

  return (
    <div className="flex flex-col gap-5">
    <div className="flex flex-col lg:flex-row gap-5">

      {/* ── 3D Canvas ── */}
      <div
        className="flex-1 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', minHeight: '420px' }}
      >
        <OrbitalCanvas
          starMass={starMass}
          initialDistance={initialDistance}
          initialSpeed={initialSpeed}
          running={running}
          resetKey={resetKey}
          onUpdate={handleUpdate}
        />
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">

        {/* Controls */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Controls
          </p>

          <div className="space-y-5">
            {/* Initial speed */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Initial speed</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{initialSpeed.toFixed(1)}</span>
              </div>
              <input type="range" min={0} max={14} step={0.1} value={initialSpeed}
                disabled={running}
                onChange={(e) => setInitialSpeed(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: running ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>0 (falls in)</span><span>14 (escapes)</span>
              </div>
            </div>

            {/* Star mass */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Star mass</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{starMass}</span>
              </div>
              <input type="range" min={100} max={1000} step={10} value={starMass}
                disabled={running}
                onChange={(e) => setStarMass(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: running ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>100</span><span>1000</span>
              </div>
            </div>

            {/* Starting distance */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Starting distance</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{initialDistance}</span>
              </div>
              <input type="range" min={5} max={30} step={0.5} value={initialDistance}
                disabled={running}
                onChange={(e) => setInitialDistance(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: running ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>5</span><span>30 units</span>
              </div>
            </div>
          </div>

          {/* Speed hints */}
          <div className="mt-5 p-3.5 rounded-lg space-y-1.5" style={{ background: 'var(--bg-muted)' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Circular orbit speed</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>{vCirc}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Escape speed</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>{vEsc}</span>
            </div>
          </div>
        </div>

        {/* Readouts */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Readouts
          </p>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Status</span>
              <span style={{
                background:   statusBg,
                color:        statusColor,
                border:       `1px solid ${statusBorder}`,
                borderRadius: 6,
                padding:      '2px 10px',
                fontSize:     12,
                fontWeight:   600,
                letterSpacing: '0.02em',
              }}>
                {statusLabel}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Speed</span>
              <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                {liveSpeed.toFixed(2)}
                <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>u/s</span>
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Distance</span>
              <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                {liveDistance.toFixed(2)}
                <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>units</span>
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setRunning(true)}
            disabled={!canLaunch}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--accent)', color: '#fff',
              opacity: canLaunch ? 1 : 0.4,
              cursor: canLaunch ? 'pointer' : 'not-allowed',
            }}
          >
            Launch
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Drag the 3D view to rotate
        </p>

      </div>
    </div>

    <TutorPanel
      simId="orbits"
      simState={simState}
      hasResult={status !== 'ready'}
      rawState={{ status }}
    />
    </div>
  );
}
