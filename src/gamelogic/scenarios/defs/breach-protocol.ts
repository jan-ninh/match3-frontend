import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel02 } from '../../levels/level-02';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "breach-protocol"
 * Implementation source: legacy makeLevel02 (kept for compatibility).
 */
export function makeBreachProtocolScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel02(args);
}
