import type { ScenarioKey } from '../scenarios/scenarioKeys';

export const STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type StageId = (typeof STAGE_IDS)[number];

const STAGE_ID_SET: ReadonlySet<number> = new Set<number>(STAGE_IDS);

export function isStageId(v: number): v is StageId {
  const n = v | 0;
  return STAGE_ID_SET.has(n);
}

/**
 * SSOT: StageId (1..12) → ScenarioKey
 *
 * Swapping levels in the campaign becomes a 1-file change:
 * - swap the ScenarioKey values between stage numbers.
 */
export const STAGE_CATALOG: Readonly<Record<StageId, ScenarioKey>> = {
  1: 'level1-redesign',
  2: 'level2-redesign',
  3: 'tiberium-run',
  4: 'signal-breach',
  5: 'match-rush',
  6: 'laserrow-match4-training',
  7: 'patch-the-hole',
  8: 'false-identity',
  9: 'stone-tiles-intro',
  10: 'firewall-sweep-bossroom',
  11: 'enemy-turn-trace',
  12: 'sandbox',
} as const;

export function getScenarioKeyForStage(stageId: StageId): ScenarioKey {
  return STAGE_CATALOG[stageId];
}
