import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

import { makeLevel01 } from './level-01';

// Slightly smaller palette for early levels => more intentional play near objectives.
const DEFAULT_TYPES: PieceType[] = ['blue', 'green', 'purple', 'orange', 'cyan', 'yellow'];

const BASE_SEED = 12345;

function makeFallbackLevel(levelId: number): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 14;

  const seed = deriveSeed(BASE_SEED, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices: [],
    allowedTypes: DEFAULT_TYPES,
    firewallNodes: [],
    gateIndices: [],
    baseSeed: seed,
  };
}

export function getLevelDefinition(levelId: number): LevelDefinition {
  if (levelId === 1) return makeLevel01({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
  return makeFallbackLevel(levelId);
}
