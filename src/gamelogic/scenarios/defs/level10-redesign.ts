import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Stage 10 redesign: Firewall Sweep.
 *
 * Reuses the terminal objective from Stage 9 and adds one pressure mechanic:
 * every third turn, the warned row/column is swept and refilled.
 *
 * No contamination or firewall hazards are spawned by the sweep.
 */
export function makeLevel10RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 10;
  const width = 8;
  const height = 8;

  const objectiveTerminalNodes = [
    { index: 1 + 3 * width, id: 0, requiredCharge: 3 },
    { index: 6 + 4 * width, id: 1, requiredCharge: 3 },
  ];

  return {
    id: levelId,
    width,
    height,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 18,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Firewall Sweep',

    blockedIndices: objectiveTerminalNodes.map((node) => node.index),

    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    objectiveTerminalNodes,

    sweepEnabled: true,
    sweepContaminationCount: 0,
    sweepFirewallCount: 0,
    sweepEveryNTurns: 3,
  };
}
