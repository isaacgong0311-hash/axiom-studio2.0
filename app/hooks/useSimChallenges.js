'use client';

import { useEffect } from 'react';
import { useProgress } from '../contexts/ProgressContext';
import { CHALLENGES, DETECTORS } from '../sims/challenges';

/**
 * Call this in any sim component. Runs after every render and fires
 * completeChallenge() the first time a condition becomes true.
 *
 * @param {string} simId   — e.g. 'projectile'
 * @param {object} state   — flat object of raw values the detectors check
 */
export function useSimChallenges(simId, state) {
  const { completed, completeChallenge } = useProgress();

  useEffect(() => {
    const simChallenges = CHALLENGES.filter((c) => c.simId === simId);
    for (const challenge of simChallenges) {
      if (completed.has(challenge.id)) continue;
      const detector = DETECTORS[challenge.id];
      if (detector?.(state)) {
        completeChallenge(challenge.id);
      }
    }
  }); // No dep array: re-run on every render, guarded by completed.has()
}
