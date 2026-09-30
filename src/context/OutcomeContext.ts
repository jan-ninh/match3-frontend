import { createContext, useContext } from 'react';
import type { AccountGameplayStore, GameplayState } from '@/services/account/gameplayStore';
export const OutcomeContext = createContext<{ store: AccountGameplayStore; gameplay: GameplayState } | null>(null);
export function useAccountOutcome() {
  const value = useContext(OutcomeContext);
  if (!value) throw new Error('Missing account gameplay provider');
  return value;
}
