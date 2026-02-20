// src/gamelogic/levels/level-07.ts
import type { LevelDefinition, PieceType } from '../types';
import { makeLevelLike01 } from './level-01';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 07 — Match Rush (Tuning Knobs)
 *
 * Goal: keep all "important knobs" for this level in ONE place.
 * - moves/time affect HUD + time-based lose (currently UI-driven)
 * - progress points are UI-driven and convert to % via targetUnits
 *
 * Notes:
 * - globalMultiplier scales ALL point sources (matches + items).
 * - timeLimitSec is NOT scaled by the multiplier.
 * - Item mapping (EngineEvent.powerUsed.key):
 *   - 3x3 gridlaser may appear as 'gridlaser' OR legacy 'bomb'
 *   - row-laser appears as 'laser'
 */
export const LEVEL07_TUNING = {
  moves: 100,

  // Time limit for the run (seconds). UI countdown uses this.
  timeLimitSec: 90,

  // Multiplies ALL point sources (matches + items). 1 = neutral.
  globalMultiplier: 30,

  // Progress bar fills to 100% when accumulated units reach this target.
  targetUnits: 900,

  // Base units per match group size.
  // Rule: len>=5 uses match5.
  matchUnits: {
    match3: 1,
    match4: 3,
    match5: 8,
  },

  // Base units for items (power usage).
  itemUnits: {
    gridlaser3x3: 3,
    laserRow: 3,
  },
} as const;

export function makeLevel07({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const base = makeLevelLike01({ levelId: 7, baseSeed, allowedTypes });
  return {
    ...base,
    moves: LEVEL07_TUNING.moves,
  };
}
