import type { LevelDefinition, PieceType } from './types';
import { deriveSeed } from './rng';

const DEFAULT_TYPES: PieceType[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export function getLevelDefinition(levelId: number): LevelDefinition {
  const width = 9;
  const height = 9;

  const blockedIndices = [7 + 7 * width, 8 + 7 * width, 7 + 8 * width, 8 + 8 * width];

  const baseSeed = 12345;
  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    blockedIndices,
    allowedTypes: DEFAULT_TYPES,
    baseSeed: seed,
  };
}