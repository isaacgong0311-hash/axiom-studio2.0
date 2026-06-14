'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CHALLENGES } from '../sims/challenges';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  // Set of completed challenge IDs
  const [completed, setCompleted] = useState(new Set());
  // ID of the most-recently completed challenge (for the toast); null = no toast
  const [justCompleted, setJustCompleted] = useState(null);
  // Prediction accuracy stats
  const [predStats, setPredStats] = useState({ correct: 0, total: 0 });

  // Hydrate from localStorage once on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('axiom-progress');
      if (saved) setCompleted(new Set(JSON.parse(saved)));

      const savedPreds = localStorage.getItem('axiom-preds');
      if (savedPreds) setPredStats(JSON.parse(savedPreds));
    } catch {
      // Silently ignore parse errors
    }
  }, []);

  const completeChallenge = useCallback((id) => {
    // Guard: only complete each challenge once
    setCompleted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('axiom-progress', JSON.stringify([...next]));
      } catch { /* ignore storage errors */ }
      return next;
    });
    // Trigger toast — only fire if not already showing (avoids rapid-fire)
    setJustCompleted((prev) => prev ?? id);
  }, []);

  const clearJustCompleted = useCallback(() => setJustCompleted(null), []);

  const trackPrediction = useCallback((isCorrect) => {
    setPredStats((prev) => {
      const next = { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 };
      try {
        localStorage.setItem('axiom-preds', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Expose the challenge list with a done flag for convenience
  const challengesWithStatus = CHALLENGES.map((c) => ({
    ...c,
    done: completed.has(c.id),
  }));

  return (
    <ProgressContext.Provider value={{
      completed,
      completeChallenge,
      justCompleted,
      clearJustCompleted,
      predStats,
      trackPrediction,
      challengesWithStatus,
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
