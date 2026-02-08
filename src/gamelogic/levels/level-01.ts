import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

export function makeLevel01({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const id = 1;

  // Smaller board for Level 1 clarity / faster pacing
  const width = 8;
  const height = 8;

  // Exit gate (2x2) in level 1 only (bottom-right)
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

  // Gate tiles are blocked cells that become “open” once all nodes are destroyed.
  const gateIndices = cornerBlocks;

  // Block the objective tiles themselves (nodes + gate footprint).
  const blockedIndices = [...cornerBlocks, ...firewallNodes.map((n) => n.index)];

  // Tighter than 20 so Level 1 has a little bite.
  const moves = 14;

  const seed = deriveSeed(baseSeed, id);

  return {
    id,
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
