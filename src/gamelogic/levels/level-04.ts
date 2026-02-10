// src/gamelogic/levels/level-04.ts
import type { LevelDefinition, PieceType } from '../types';
import { makeLevelLike01 } from './level-01';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level-04 placeholder.
 * For now: same rules/objective as Level-01 (clean-room template).
 */
export function makeLevel04({ baseSeed, allowedTypes }: Args): LevelDefinition {
  return makeLevelLike01({ levelId: 4, baseSeed, allowedTypes });
}
