'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ScenarioContext = createContext(null);

export function ScenarioProvider({ children }) {
  const [pendingScenario, setPendingScenario] = useState(null);
  const dispatchScenario = useCallback((name) => setPendingScenario(name), []);
  const clearScenario    = useCallback(() => setPendingScenario(null), []);
  return (
    <ScenarioContext.Provider value={{ pendingScenario, dispatchScenario, clearScenario }}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error('useScenario must be inside <ScenarioProvider>');
  return ctx;
}
