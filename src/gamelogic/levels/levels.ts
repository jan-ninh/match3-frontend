// src/gamelogic/levels/levels.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

import { getScenarioDefinition } from '../scenarios/registry';
import { getScenarioKeyForStage, isStageId, type StageId } from '../stages/stageCatalog';

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
    allowedTypes: DEFAULT_TYPES,
    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
  };
}

function normalizeStageDefinition(stageId: StageId, raw: LevelDefinition): LevelDefinition {
  // BaseSeed is used by initLevel seedPolicy='fixedBase' (SSOT).
  // Keep it stage-owned so swapping scenarios between stages doesn't require touching scenario files.
  const stageBaseSeed = deriveSeed(BASE_SEED, stageId);

  return {
    ...raw,
    id: stageId,
    baseSeed: stageBaseSeed,
  };
}

/**
 * StageId → LevelDefinition
 *
 * MS1 change:
 * - Stage selection stays numeric (1..12) for progress/backends.
 * - Content is now resolved via StageCatalog (StageId → ScenarioKey) + Scenario Registry.
 */
export function getLevelDefinition(levelId: number): LevelDefinition {
  if (!isStageId(levelId)) return makeFallbackLevel(levelId);

  const stageId: StageId = levelId;
  const key = getScenarioKeyForStage(stageId);

  const def = getScenarioDefinition(key, { baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
  return normalizeStageDefinition(stageId, def);
}
