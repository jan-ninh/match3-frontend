import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel11 } from '../../levels/level-11';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "enemy-turn-trace"
 * Implementation source: legacy makeLevel11 (kept for compatibility).
 */
export function makeEnemyTurnTraceScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel11(args);
}
