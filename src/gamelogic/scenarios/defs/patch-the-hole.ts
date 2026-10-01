import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel06 } from '../../levels/level-06';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "patch-the-hole"
 * Implementation source: legacy makeLevel06 (kept for compatibility).
 */
export function makePatchTheHoleScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel06(args);
}
