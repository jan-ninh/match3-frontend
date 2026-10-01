import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel08 } from '../../levels/level-08';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "laserrow-match4-training"
 * Implementation source: legacy makeLevel08 (kept for compatibility).
 */
export function makeLaserRowMatch4TrainingScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel08(args);
}
