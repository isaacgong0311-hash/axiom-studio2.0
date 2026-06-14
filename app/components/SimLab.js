'use client';

// SimLab is the main interactive shell.
// It owns:
//   1. Which sim is active
//   2. Whether the scratchpad is open
//
// To add a new simulation later:
//   1. Add its entry to app/sims/registry.js (change status to 'active')
//   2. Build the component in app/sims/<name>/<Name>Sim.js
//   3. Import it here and add it to SIM_COMPONENTS below

import { useState, useEffect } from 'react';
import { SIMS } from '../sims/registry';
import { useSimNav } from '../contexts/SimNavContext';
import SimSelector from './SimSelector';
import ChallengeStrip from './ChallengeStrip';
import ProjectileSim from '../sims/projectile/ProjectileSim';
import PendulumSim from '../sims/pendulum/PendulumSim';
import OrbitalSim from '../sims/orbital/OrbitalSim';
import CollisionSim from '../sims/collisions/CollisionSim';
import PlaceholderSim from '../sims/PlaceholderSim';
import Scratchpad from './Scratchpad';

// Maps sim IDs to their React components.
// If an ID isn't here, PlaceholderSim is shown instead.
const SIM_COMPONENTS = {
  projectile: ProjectileSim,
  pendulum:   PendulumSim,
  orbits:     OrbitalSim,
  collisions: CollisionSim,
};

function PenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function SimLab({ initialSim = 'projectile' }) {
  const [activeId, setActiveId] = useState(initialSim);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);

  const { requestedSim, clearNav } = useSimNav();
  useEffect(() => {
    if (!requestedSim) return;
    if (SIM_COMPONENTS[requestedSim]) setActiveId(requestedSim);
    clearNav();
  }, [requestedSim, clearNav]);

  const activeMeta = SIMS.find((s) => s.id === activeId);
  const ActiveSim  = SIM_COMPONENTS[activeId] || PlaceholderSim;

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Tab bar */}
      <SimSelector sims={SIMS} activeId={activeId} onSelect={setActiveId} />

      {/* Challenge strip */}
      <ChallengeStrip simId={activeId} />

      {/* Active simulation */}
      <ActiveSim
        name={activeMeta?.name}
        tagline={activeMeta?.tagline}
      />

      {/* ── Scratchpad ───────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setScratchpadOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm"
          style={{
            background:  'var(--bg-surface)',
            color:       'var(--text)',
            cursor:      'pointer',
            border:      'none',
            textAlign:   'left',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--text-muted)' }}>
              <PenIcon />
            </span>
            <span className="font-medium">Scratchpad</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              · draw, write equations, sketch ideas
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>
            <ChevronIcon open={scratchpadOpen} />
          </span>
        </button>

        {/* Scratchpad panel — always mounted, toggled via CSS so canvas survives */}
        <Scratchpad isOpen={scratchpadOpen} />
      </div>

    </div>
  );
}
