import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PowerKey, Powers } from '@/types';

type PowerContextValue = {
  powers: Powers;
  setFromBackendAndSelect: (backendPowers: Powers, selected: PowerKey) => void;
  setPowers: (next: Powers) => void;
};

const defaultPowers: Powers = { bomb: 3, rocket: 0, extraTime: 0 };

const PowerContext = createContext<PowerContextValue | null>(null);

function getChoiceBonus(selected: PowerKey): number {
  return selected === 'bomb' ? 2 : 1;
}

export function PowerProvider({ children }: { children: ReactNode }) {
  const [powers, setPowersState] = useState<Powers>(() => defaultPowers);

  const setPowers = (next: Powers) => {
    setPowersState(next);
  };

  // NOTE:
  // This function may be called AFTER the UI already granted the bonus (e.g. Modal adds +2 immediately).
  // To prevent double-counting, we keep the higher of:
  // - prev[selected] (current UI state)
  // - backend[selected] + bonus (expected post-choice value if backend is "base")
  const setFromBackendAndSelect = (backendPowers: Powers, selected: PowerKey) => {
    const bonus = getChoiceBonus(selected);

    setPowersState((prev) => {
      const next: Powers = {
        bomb: backendPowers.bomb ?? 0,
        rocket: backendPowers.rocket ?? 0,
        extraTime: backendPowers.extraTime ?? 0,
      };

      const prevCount = (prev[selected] ?? 0) | 0;
      const candidate = ((next[selected] ?? 0) | 0) + bonus;

      next[selected] = Math.max(prevCount, candidate);

      return next;
    });
  };

  const value = useMemo(() => ({ powers, setFromBackendAndSelect, setPowers }), [powers]);

  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
}

export function usePowers() {
  const ctx = useContext(PowerContext);
  if (!ctx) throw new Error('usePowers must be used inside PowerProvider');
  return ctx;
}
