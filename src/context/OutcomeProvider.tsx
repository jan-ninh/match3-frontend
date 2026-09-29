import { useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { OutcomeStore } from '@/services/account/outcomeStore';
import { OutcomeContext } from './OutcomeContext';
export function OutcomeProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new OutcomeStore());
  const outcome = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <OutcomeContext.Provider value={{ store, outcome }}>{children}</OutcomeContext.Provider>;
}
