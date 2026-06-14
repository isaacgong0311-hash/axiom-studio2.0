'use client';

import { useProgress } from '../contexts/ProgressContext';
import { CHALLENGES_BY_SIM } from '../sims/challenges';

export default function HubProgressBadge({ simId }) {
  const { completed } = useProgress();
  const challenges = CHALLENGES_BY_SIM[simId] ?? [];
  const done = challenges.filter((c) => completed.has(c.id)).length;
  const total = challenges.length;

  if (total === 0) return null;

  const allDone = done === total;

  return (
    <div
      className="flex items-center gap-1.5 text-xs font-medium"
      style={{ color: allDone ? '#4ade80' : 'var(--text-muted)' }}
    >
      <span>{allDone ? '★' : '○'}</span>
      <span>{done}/{total} challenges</span>
    </div>
  );
}
