import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel03 } from '../../levels/level-03';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "tiberium-run"
 * Implementation source: legacy makeLevel03 (kept for compatibility).
 */
export function makeTiberiumRunScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel03(args);
}
