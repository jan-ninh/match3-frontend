import type { LevelDefinition, PieceType } from '../types';

import type { ScenarioKey } from './scenarioKeys';

import { makeLevel1RedesignScenario } from './defs/level1-redesign';
import { makeLevel2RedesignScenario } from './defs/level2-redesign';
import { makeCleanRoomScenario } from './defs/clean-room';
import { makeBreachProtocolScenario } from './defs/breach-protocol';
import { makeTiberiumRunScenario } from './defs/tiberium-run';
import { makeSignalBreachScenario } from './defs/signal-breach';
import { makeFalseIdentityScenario } from './defs/false-identity';
import { makePatchTheHoleScenario } from './defs/patch-the-hole';
import { makeMatchRushScenario } from './defs/match-rush';
import { makeLaserRowMatch4TrainingScenario } from './defs/laserrow-match4-training';
import { makeStoneTilesIntroScenario } from './defs/stone-tiles-intro';
import { makeFirewallSweepBossroomScenario } from './defs/firewall-sweep-bossroom';
import { makeEnemyTurnTraceScenario } from './defs/enemy-turn-trace';
import { makeSandboxScenario } from './defs/sandbox';

export type ScenarioFactoryArgs = Readonly<{
  baseSeed: number;
  allowedTypes: PieceType[];
}>;

export type ScenarioFactory = (args: ScenarioFactoryArgs) => LevelDefinition;

/**
 * Scenario Registry (SSOT for ScenarioKey → definition factory).
 *
 * MS3:
 * - numeric Level files stay as a compatibility layer
 * - ScenarioKey now maps to semantic scenario modules in `scenarios/defs/*`
 */
const SCENARIO_REGISTRY: Readonly<Record<ScenarioKey, ScenarioFactory>> = {
  'level1-redesign': makeLevel1RedesignScenario,
  'level2-redesign': makeLevel2RedesignScenario,
  'clean-room': makeCleanRoomScenario,
  'breach-protocol': makeBreachProtocolScenario,
  'tiberium-run': makeTiberiumRunScenario,
  'signal-breach': makeSignalBreachScenario,
  'false-identity': makeFalseIdentityScenario,
  'patch-the-hole': makePatchTheHoleScenario,
  'match-rush': makeMatchRushScenario,
  'laserrow-match4-training': makeLaserRowMatch4TrainingScenario,
  'stone-tiles-intro': makeStoneTilesIntroScenario,
  'firewall-sweep-bossroom': makeFirewallSweepBossroomScenario,
  'enemy-turn-trace': makeEnemyTurnTraceScenario,
  'sandbox': makeSandboxScenario,
} as const;

export function getScenarioDefinition(key: ScenarioKey, args: ScenarioFactoryArgs): LevelDefinition {
  return SCENARIO_REGISTRY[key](args);
}
