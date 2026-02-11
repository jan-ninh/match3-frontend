import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

type MakeLevelLike01Args = {
  levelId: number;
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level-01 rules template.
 * Use this for early levels so they all share the same structure/objective (for now).
 */
export function makeLevelLike02({ levelId, baseSeed, allowedTypes }: MakeLevelLike01Args): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    baseSeed: seed,
  };
}

export function makeLevel02({ baseSeed, allowedTypes }: Args): LevelDefinition {
  return makeLevelLike02({ levelId: 2, baseSeed, allowedTypes });
}
