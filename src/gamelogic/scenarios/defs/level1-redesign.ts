import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const TUTORIAL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Experimental Stage 1 replacement.
 *
 * Goal:
 * - teach normal swaps / matches with no fail pressure
 * - collect cyan tiles through normal Match-3 clears
 * - keep the original "clean-room" scenario untouched
 */
export function makeLevel1RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 1;

  return {
    id: levelId,
    width: 8,
    height: 8,
    baseSeed: deriveSeed(baseSeed, levelId),

    // Effectively unlimited: swaps do not spend moves and moves cannot cause a loss.
    moves: 999,
    movesLoseEnabled: false,
    swapSpendsMove: false,

    allowedTypes: [...TUTORIAL_TYPES],

    objectiveTitle: 'Collect Cyan Data',
    collectObjective: {
      pieceType: 'cyan',
      target: 20,
    },

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
  };
}