import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel01 } from '../../levels/level-01';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "clean-room"
 * Implementation source: legacy makeLevel01 (kept for compatibility).
 */
export function makeCleanRoomScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel01(args);
}
