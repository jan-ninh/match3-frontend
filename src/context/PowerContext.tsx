import { createContext, useContext } from 'react';
import type { PowerKey, Powers } from '@/types';

export type PowerContextValue = {
  powers: Powers;
  setFromBackendAndSelect: (backendPowers: Powers, selected: PowerKey) => void;
  setPowers: (next: Powers) => void;
};

//----------------------------------------------------
// SET INITIAL POWERITEMS
//----------------------------------------------------
const INITIAL_BOMBS = 20;
const INITIAL_LASERS = 20;
const INITIAL_EXTRA_TIME = 20;

export const defaultPowers = Object.freeze({
  bomb: INITIAL_BOMBS,
  laser: INITIAL_LASERS,
  extraShuffle: INITIAL_EXTRA_TIME,
} satisfies Powers);

export const PowerContext = createContext<PowerContextValue | null>(null);

const CHOICE_BONUS_BY_KEY: Readonly<Partial<Record<string, number>>> = Object.freeze({
  // current
  bomb: 2,
  // planned (safe even if PowerKey union doesn't contain these yet)
  laser: 2,
  reshuffle: 2, // = 2 rerolls (future)
});

export function getChoiceBonus(selected: PowerKey): number {
  /**
   * Future-proof choice bonuses:
   * - bomb      -> +2 bombs
   * - laser    -> +2 lasers
   * - reshuffle -> +2 rerolls (future)
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
