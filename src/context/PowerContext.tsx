// src\context\PowerContext.tsx
import { createContext, useContext } from 'react';
import type { PowerKey, Powers } from '@/types';

export type PowerContextValue = {
  powers: Powers;
  setFromBackendAndSelect: (backendPowers: Powers, selected: PowerKey) => void;
  setPowers: (next: Powers) => void;
  selectedPowersForNextStage: Partial<Powers> | null;
  setSelectedPowersForNextStage: (powers: Partial<Powers> | null) => void;
};

//----------------------------------------------------
// SET INITIAL POWERITEMS
//----------------------------------------------------
const INITIAL_BOMBS = 20;
const INITIAL_LASERS = 20;
const INITIAL_EXTRA_SHUFFLE = 20;

export const defaultPowers = Object.freeze({
  bomb: INITIAL_BOMBS,
  laser: INITIAL_LASERS,
  extraShuffle: INITIAL_EXTRA_SHUFFLE,
} satisfies Powers);

export const PowerContext = createContext<PowerContextValue | null>(null);

const CHOICE_BONUS_BY_KEY: Readonly<Partial<Record<string, number>>> = Object.freeze({
  // current
  bomb: 2,
  // planned / utility
  laser: 2,
  extraShuffle: 2, // = 2 reshuffles
});

export function getChoiceBonus(selected: PowerKey): number {
  /**
   * Choice bonuses:
   * - bomb         -> +2 bombs
   * - laser       -> +2 lasers
   * - extraShuffle -> +2 reshuffles
   *
   * Any other selection defaults to +1.
   */
  return CHOICE_BONUS_BY_KEY[String(selected)] ?? 1;
}

export function usePowers() {
  const ctx = useContext(PowerContext);
  if (!ctx) throw new Error('usePowers must be used inside PowerProvider');
  return ctx;
}
