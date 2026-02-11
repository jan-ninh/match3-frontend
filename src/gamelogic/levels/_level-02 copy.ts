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
  // Smaller board for clarity / faster pacing
  const width = 8;
  const height = 8;

  // “Nodes” (firewall) must be damaged by making matches adjacent to them.
  // Each node has hp=3 => needs 3 adjacent match-resolves (can be across turns/cascades).
  const hp = 3;
  const firewallNodes = [
    { index: 2 + 2 * width, hp }, // (2,2)
    { index: 5 + 3 * width, hp }, // (5,3)
    { index: 3 + 5 * width, hp }, // (3,5)
  ];

  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices: [],
    gateIndices: [],
    firewallNodes,
    baseSeed: seed,
  };
}

export function makeLevel02({ baseSeed, allowedTypes }: Args): LevelDefinition {
  return makeLevelLike02({ levelId: 2, baseSeed, allowedTypes });
}
