import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel05 } from '../../levels/level-05';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "false-identity"
 * Implementation source: legacy makeLevel05 (kept for compatibility).
 */
export function makeFalseIdentityScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel05(args);
}
