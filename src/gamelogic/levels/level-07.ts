// src/gamelogic/levels/level-07.ts
import type { LevelDefinition, PieceType } from '../types';
import { makeLevelLike01 } from './level-01';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level-07 placeholder.
 * For now: Level-01-like board/rules, but with 100 moves (HUD uses this for MOVE panel).
 */
export function makeLevel07({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const base = makeLevelLike01({ levelId: 7, baseSeed, allowedTypes });
  return {
    ...base,
    moves: 100,
  };
}
