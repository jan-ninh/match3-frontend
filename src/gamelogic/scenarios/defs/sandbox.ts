import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel12 } from '../../levels/level-12';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "sandbox"
 * Implementation source: legacy makeLevel12 (kept for compatibility).
 */
export function makeSandboxScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel12(args);
}
