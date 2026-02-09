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
export function makeLevelLike01({ levelId, baseSeed, allowedTypes }: MakeLevelLike01Args): LevelDefinition {
  // Smaller board for clarity / faster pacing
  const width = 8;
  const height = 8;

  // Blocked corner cells (2x2) in bottom-right:
  // (6,6) (7,6) (6,7) (7,7)
  const cornerBlocks = [6 + 6 * width, 7 + 6 * width, 6 + 7 * width, 7 + 7 * width];

  // “Nodes” (firewall) must be damaged by making matches adjacent to them.
  // Each node has hp=3 => needs 3 adjacent match-resolves (can be across turns/cascades).
  const hp = 3;
  const firewallNodes = [
    { index: 2 + 2 * width, hp }, // (2,2)
    { index: 5 + 3 * width, hp }, // (5,3)
    { index: 3 + 5 * width, hp }, // (3,5)
  ];

  // Gate system exists in engine, but template doesn't use gate tiles yet.
  const gateIndices: number[] = [];

  // Block the objective tiles themselves (nodes + corner blocks).
  const blockedIndices = [...cornerBlocks, ...firewallNodes.map((n) => n.index)];

  // Tighter than 20 so it has a little bite.
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices,
    allowedTypes,
    firewallNodes,
    gateIndices,
    baseSeed: seed,
  };
}

export function makeLevel01({ baseSeed, allowedTypes }: Args): LevelDefinition {
  return makeLevelLike01({ levelId: 1, baseSeed, allowedTypes });
}
