import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { accountGameplay } from '@/api/accountGameplay';
import { OutcomeContext } from './OutcomeContext';
export function OutcomeProvider({ children }: { children: ReactNode }) {
  const gameplay = useSyncExternalStore(accountGameplay.subscribe, accountGameplay.getSnapshot);
  return <OutcomeContext.Provider value={{ store: accountGameplay, gameplay }}>{children}</OutcomeContext.Provider>;
}
