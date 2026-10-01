import type { LevelDefinition } from '../../types';
import type { ScenarioFactoryArgs } from '../registry';

import { makeLevel10 } from '../../levels/level-10';

/**
 * Scenario definition wrapper (MS3).
 *
 * Owns: ScenarioKey "firewall-sweep-bossroom"
 * Implementation source: legacy makeLevel10 (kept for compatibility).
 */
export function makeFirewallSweepBossroomScenario(args: ScenarioFactoryArgs): LevelDefinition {
  return makeLevel10(args);
}
