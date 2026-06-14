'use client';

import { useEffect } from 'react';
import { ProgressProvider, useProgress } from '../contexts/ProgressContext';
import { ScenarioProvider } from '../contexts/ScenarioContext';
import { SimNavProvider }   from '../contexts/SimNavContext';
import { CHALLENGES } from '../sims/challenges';

// ── Solved toast ──────────────────────────────────────────────
// Rendered inside ProgressProvider so it can read the context.
function SolvedToast() {
  const { justCompleted, clearJustCompleted } = useProgress();

  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(clearJustCompleted, 4200);
    return () => clearTimeout(t);
  }, [justCompleted, clearJustCompleted]);

  if (!justCompleted) return null;

  const challenge = CHALLENGES.find((c) => c.id === justCompleted);

  return (
    <div
      className="axiom-toast"
      style={{
        position:     'fixed',
        bottom:       24,
        right:        24,
        zIndex:       9999,
        background:   '#131318',
        border:       '1px solid rgba(74,222,128,0.5)',
        borderLeft:   '3px solid #4ade80',
        borderRadius: 10,
        padding:      '12px 16px',
        maxWidth:     280,
        boxShadow:    '0 4px 32px rgba(0,0,0,0.5)',
        cursor:       'pointer',
      }}
      onClick={clearJustCompleted}
    >
      <div
        style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', letterSpacing: '0.04em', marginBottom: 3 }}
      >
        ✓ Challenge solved!
      </div>
      <div style={{ fontSize: 13, color: '#e8e9f3' }}>
        {challenge?.label ?? 'Nice work!'}
      </div>
      {challenge?.hint && (
        <div style={{ fontSize: 11, color: '#7b7fa8', marginTop: 5, lineHeight: 1.5 }}>
          {challenge.hint}
        </div>
      )}
      <div style={{ fontSize: 10, color: '#7b7fa8', marginTop: 6, opacity: 0.6 }}>
        Ask Axion why it worked →
      </div>
    </div>
  );
}

// ── App-wide provider wrapper ─────────────────────────────────
// layout.js (server) renders this as a client boundary.
export default function Providers({ children }) {
  return (
    <ProgressProvider>
      <ScenarioProvider>
        <SimNavProvider>
          <SolvedToast />
          {children}
        </SimNavProvider>
      </ScenarioProvider>
    </ProgressProvider>
  );
}
