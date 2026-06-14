'use client';

import { useProgress } from '../contexts/ProgressContext';
import { CHALLENGES } from '../sims/challenges';

export default function HubOverallProgress() {
  const { completed } = useProgress();
  const total = CHALLENGES.length;
  const done  = CHALLENGES.filter((c) => completed.has(c.id)).length;

  if (done === 0) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <div
      className="rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ borderColor: 'rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.06)' }}
    >
      {/* Progress bar */}
      <div className="flex-1">
        <div className="flex justify-between mb-1.5">
          <span className="text-sm font-medium" style={{ color: '#4ade80' }}>
            {done === total ? '★ All challenges complete!' : `${done} of ${total} challenges solved`}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
        </div>
        <div style={{ background: 'var(--bg-muted)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`, height: '100%',
              background: 'linear-gradient(90deg, #4ade80, #22d3ee)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
