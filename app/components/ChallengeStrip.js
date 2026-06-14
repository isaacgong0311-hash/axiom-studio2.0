'use client';

import { useState } from 'react';
import { useProgress } from '../contexts/ProgressContext';
import { CHALLENGES_BY_SIM } from '../sims/challenges';

export default function ChallengeStrip({ simId }) {
  const { completed } = useProgress();
  const challenges = CHALLENGES_BY_SIM[simId] ?? [];
  const doneCount  = challenges.filter((c) => completed.has(c.id)).length;
  const [tooltip, setTooltip] = useState(null);

  if (challenges.length === 0) return null;

  return (
    <div
      className="rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)', position: 'relative' }}
    >
      {/* Label */}
      <span
        className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Challenges
      </span>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        {doneCount}/{challenges.length}
      </span>

      {/* Pills */}
      <div className="flex flex-wrap gap-2">
        {challenges.map((c) => {
          const done = completed.has(c.id);
          return (
            <div
              key={c.id}
              className="relative"
              onMouseEnter={() => setTooltip(c.id)}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                style={{
                  border:     `1px solid ${done ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
                  background: done ? 'rgba(74,222,128,0.08)' : 'transparent',
                  color:      done ? '#4ade80' : 'var(--text-muted)',
                  cursor:     'default',
                  transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                }}
              >
                <span>{done ? '✓' : '○'}</span>
                <span>{c.label}</span>
              </div>

              {/* Hint tooltip */}
              {tooltip === c.id && (
                <div
                  style={{
                    position:    'absolute',
                    bottom:      'calc(100% + 8px)',
                    left:        '50%',
                    transform:   'translateX(-50%)',
                    background:  '#1a1a24',
                    border:      '1px solid var(--border)',
                    borderRadius: 8,
                    padding:     '7px 11px',
                    fontSize:    11,
                    color:       'var(--text-muted)',
                    whiteSpace:  'nowrap',
                    zIndex:      50,
                    pointerEvents: 'none',
                    lineHeight:  1.5,
                    boxShadow:   '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {c.hint}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
