import type { LevelDefinition, PieceType } from '../types';

import type { ScenarioKey } from './scenarioKeys';

import { makeLevel01 } from '../levels/level-01';
import { makeLevel02 } from '../levels/level-02';
import { makeLevel03 } from '../levels/level-03';
import { makeLevel04 } from '../levels/level-04';
import { makeLevel05 } from '../levels/level-05';
import { makeLevel06 } from '../levels/level-06';
import { makeLevel07 } from '../levels/level-07';
import { makeLevel08 } from '../levels/level-08';
import { makeLevel09 } from '../levels/level-09';
import { makeLevel10 } from '../levels/level-10';
import { makeLevel11 } from '../levels/level-11';
import { makeLevel12 } from '../levels/level-12';

export type ScenarioFactoryArgs = Readonly<{
  baseSeed: number;
  allowedTypes: PieceType[];
}>;

export type ScenarioFactory = (args: ScenarioFactoryArgs) => LevelDefinition;

/**
 * Scenario Registry (SSOT for ScenarioKey → definition factory).
 *
 * NOTE: In MS3 we'll rename/move the scenario files (no numeric filenames),
 * but the keys stay stable.
 */
const SCENARIO_REGISTRY: Readonly<Record<ScenarioKey, ScenarioFactory>> = {
  'clean-room': makeLevel01,
  'breach-protocol': makeLevel02,
  'tiberium-run': makeLevel03,
  'signal-breach': makeLevel04,
  'false-identity': makeLevel05,
  'patch-the-hole': makeLevel06,
  'match-rush': makeLevel07,
  'laserrow-match4-training': makeLevel08,
  'stone-tiles-intro': makeLevel09,
  'firewall-sweep-bossroom': makeLevel10,
  'enemy-turn-trace': makeLevel11,
  'sandbox': makeLevel12,
} as const;

export function getScenarioDefinition(key: ScenarioKey, args: ScenarioFactoryArgs): LevelDefinition {
  return SCENARIO_REGISTRY[key](args);
}
