// src/gamelogic/levels/levels.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

import { makeLevel01, makeLevelLike01 } from './level-01';

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
  // Level 1: CLEAN ROOM (Spikes HP1)
  if (levelId === 1) {
    return makeLevel01({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
  }

  // For now: Levels 2–12 keep the previous “nodes” template.
  if (levelId >= 2 && levelId <= 12) {
    return makeLevelLike01({ levelId, baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
  }

  // Future levels fallback (no special obstacles/objective)
  return makeFallbackLevel(levelId);
}
