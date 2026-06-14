'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const SimNavContext = createContext(null);

export function SimNavProvider({ children }) {
  const [requestedSim, setRequestedSim] = useState(null);
  const navigateToSim = useCallback((simId) => setRequestedSim(simId), []);
  const clearNav      = useCallback(() => setRequestedSim(null), []);
  return (
    <SimNavContext.Provider value={{ requestedSim, navigateToSim, clearNav }}>
      {children}
    </SimNavContext.Provider>
  );
}

export function useSimNav() {
  const ctx = useContext(SimNavContext);
  if (!ctx) throw new Error('useSimNav must be inside <SimNavProvider>');
  return ctx;
}
