// src/gamelogic/levels/level-04.ts
import type { LevelDefinition, PieceType } from '../types';
import { makeLevelLike01 } from './level-01';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 04 — placeholder.
 *
 * Note: The previous Level 04 definition ("FIREWALL SWEEP") was moved to Level 10
 * so Level 04 can be redesigned without affecting Level 10.
 */
export function makeLevel04({ baseSeed, allowedTypes }: Args): LevelDefinition {
  return makeLevelLike01({ levelId: 4, baseSeed, allowedTypes });
}
