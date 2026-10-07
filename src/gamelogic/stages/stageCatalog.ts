import type { ScenarioKey } from '../scenarios/scenarioKeys';

export const STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type StageId = (typeof STAGE_IDS)[number];

const STAGE_ID_SET: ReadonlySet<number> = new Set<number>(STAGE_IDS);

export function isStageId(v: number): v is StageId {
  const n = v | 0;
  return STAGE_ID_SET.has(n);
}

export const STAGE_CATALOG: Readonly<Record<StageId, ScenarioKey>> = {
  1: 'level1-redesign',
  2: 'level2-redesign',
  3: 'level3-redesign',
  4: 'level4-redesign',
  5: 'match-rush',
  6: 'level6-redesign',
  7: 'level7-redesign',
  8: 'level8-redesign',
  9: 'level9-redesign',
  10: 'level10-redesign',
  11: 'level11-redesign',
  12: 'sandbox',
} as const;

export function getScenarioKeyForStage(stageId: StageId): ScenarioKey {
  return STAGE_CATALOG[stageId];
}
