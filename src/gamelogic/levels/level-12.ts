// src/gamelogic/levels/level-12.ts
import type { LevelDefinition, PieceType } from '../types';
import { makeLevelLike01 } from './level-01';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level-12 placeholder.
 * For now: same rules/objective as Level-01 (clean-room template).
 */
export function makeLevel12({ baseSeed, allowedTypes }: Args): LevelDefinition {
  return makeLevelLike01({ levelId: 12, baseSeed, allowedTypes });
}
