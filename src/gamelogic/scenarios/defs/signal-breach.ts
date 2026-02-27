import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel04 } from '../../levels/level-04';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "signal-breach"
 * Implementation source: legacy makeLevel04 (kept for compatibility).
 */
export function makeSignalBreachScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel04(args);
}
