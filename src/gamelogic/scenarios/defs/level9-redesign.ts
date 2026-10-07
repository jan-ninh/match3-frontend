import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Stage 9 redesign: Terminal Training.
 *
 * Teaches objective terminals without the laser sweep.
 * Stage 10 can then reuse the same goal under boss pressure.
 */
export function makeLevel9RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 9;
  const width = 8;
  const height = 8;

  const objectiveTerminalNodes = [
    { index: 1 + 3 * width, id: 0, requiredCharge: 2 },
    { index: 6 + 4 * width, id: 1, requiredCharge: 2 },
  ];

  return {
    id: levelId,
    width,
    height,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 20,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Activate Terminals',

    blockedIndices: objectiveTerminalNodes.map((node) => node.index),

    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    objectiveTerminalNodes,

    sweepEnabled: false,
  };
}
