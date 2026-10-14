import type { LevelDefinition } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

/**
 * Stage 12: Sandbox / Free Play.
 *
 * No objective and no fail state.
 * Swaps do not consume moves. Scenario policy provides infinite items
 * and hides the moves widget.
 */
export function makeSandboxScenario({ baseSeed, allowedTypes }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 12;

  return {
    id: levelId,
    width: 8,
    height: 8,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 999,
    movesLoseEnabled: false,
    swapSpendsMove: false,

    allowedTypes,

    objectiveTitle: 'Sandbox',

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
  };
}
