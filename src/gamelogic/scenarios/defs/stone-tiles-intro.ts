import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel09 } from '../../levels/level-09';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "stone-tiles-intro"
 * Implementation source: legacy makeLevel09 (kept for compatibility).
 */
export function makeStoneTilesIntroScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel09(args);
}
