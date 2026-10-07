import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Experimental Stage 2 replacement.
 *
 * Progression from Stage 1:
 * - same simple collect rule
 * - same four tile colors
 * - now introduces a real move limit
 */
export function makeLevel2RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 2;

  return {
    id: levelId,
    width: 8,
    height: 8,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 20,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Collect Blue Data',
    collectObjective: {
      pieceType: 'blue',
      target: 25,
    },

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
  };
}
