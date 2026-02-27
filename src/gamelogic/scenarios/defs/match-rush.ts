import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel07 } from '../../levels/level-07';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "match-rush"
 * Implementation source: legacy makeLevel07 (kept for compatibility).
 */
export function makeMatchRushScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel07(args);
}
