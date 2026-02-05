import type { LevelDefinition, PieceType } from './types';
import { deriveSeed } from './rng';

const DEFAULT_TYPES: PieceType[] = ['blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];

export function getLevelDefinition(levelId: number): LevelDefinition {
  const width = 9;
  const height = 9;

  // reserved corner (gate in level 1; plain blocks otherwise)
  // const cornerBlocks = [7 + 7 * width, 8 + 7 * width, 7 + 8 * width, 8 + 8 * width];
  const cornerBlocks: number[] = [];

  const firewallNodes =
    levelId === 1
      ? [
          { index: 3 + 3 * width, hp: 2 }, // (3,3)
          { index: 5 + 4 * width, hp: 2 }, // (5,4)
          { index: 4 + 6 * width, hp: 2 }, // (4,6)
        ]
      : [];

  const gateIndices = levelId === 1 ? cornerBlocks : [];

  const blockedIndices = levelId === 1 ? [...cornerBlocks, ...firewallNodes.map((n) => n.index)] : cornerBlocks;

  const moves = 20;

  const baseSeed = 12345;
  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices,
    allowedTypes: DEFAULT_TYPES,
    firewallNodes,
    gateIndices,
    baseSeed: seed,
  };
}
