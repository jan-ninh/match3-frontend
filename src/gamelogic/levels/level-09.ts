import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Stage 09: Stone Tiles (moved from previous Stage 08).
 * Objective title is intentionally not a hint; player should infer mechanics from feedback.
 */
export function makeLevel09({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 9;
  const width = 8;
  const height = 8;
  const seed = deriveSeed(baseSeed, levelId);

  // central 4×3 block (12 stones) => forces learning match-adjacent + laser/gridlaser usefulness
  const stoneTileNodes = [
    // y=2 (x=2..5)
    { index: 2 + 2 * width },
    { index: 3 + 2 * width },
    { index: 4 + 2 * width },
    { index: 5 + 2 * width },
    // y=3
    { index: 2 + 3 * width },
    { index: 3 + 3 * width },
    { index: 4 + 3 * width },
    { index: 5 + 3 * width },
    // y=4
    { index: 2 + 4 * width },
    { index: 3 + 4 * width },
    { index: 4 + 4 * width },
    { index: 5 + 4 * width },
  ];

  return {
    id: levelId,
    width,
    height,
    baseSeed: seed,

    moves: 22,
    allowedTypes,

    objectiveTitle: 'Obsidian Bastion',

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    stoneTileNodes,
  };
}
