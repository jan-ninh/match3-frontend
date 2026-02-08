import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PowerKey, Powers } from '@/types';

type PowerContextValue = {
  powers: Powers;
  setFromBackendAndSelect: (backendPowers: Powers, selected: PowerKey) => void;
  setPowers: (next: Powers) => void;
};

const defaultPowers: Powers = { bomb: 0, rocket: 0, extraTime: 0 };

const PowerContext = createContext<PowerContextValue | null>(null);

export function PowerProvider({ children }: { children: ReactNode }) {
  const [powers, setPowersState] = useState<Powers>(() => defaultPowers);

  const setPowers = (next: Powers) => {
    setPowersState(next);
  };

  const setFromBackendAndSelect = (backendPowers: Powers, selected: PowerKey) => {
    const next: Powers = {
      bomb: backendPowers.bomb ?? 0,
      rocket: backendPowers.rocket ?? 0,
      extraTime: backendPowers.extraTime ?? 0,
    };
    next[selected] = (next[selected] ?? 0) + 1;
    setPowers(next);
  };

  const value = useMemo(
    () => ({ powers, setFromBackendAndSelect, setPowers }),
    [powers],
  );

  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
}

export function usePowers() {
  const ctx = useContext(PowerContext);
  if (!ctx) throw new Error('usePowers must be used inside PowerProvider');
  return ctx;
}
