import { createContext, useContext } from 'react';
import type { AccountOutcome, OutcomeStore } from '@/services/account/outcomeStore';
export const OutcomeContext = createContext<{ store: OutcomeStore; outcome: AccountOutcome | null } | null>(null);
export function useAccountOutcome() {
  const value = useContext(OutcomeContext);
  if (!value) throw new Error('Missing outcome provider');
  return value;
}
