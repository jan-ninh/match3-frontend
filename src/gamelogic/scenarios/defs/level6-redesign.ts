import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Stage 6 redesign: simplified Tiberium Run.
 *
 * Matches leave charged floor cells behind.
 * Win by creating one continuous orthogonal path from the left source
 * to the right target.
 *
 * No blocked center and no secondary mechanic.
 */
export function makeLevel6RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 6;
  const width = 8;
  const height = 8;

  return {
    id: levelId,
    width,
    height,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 18,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Connect the Signal',

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    // Straight, immediately readable A -> B layout.
    // Source: left edge at (0,3)
    // Target: right edge at (7,3)
    signalSourceNodes: [{ index: 0 + 3 * width, id: 0 }],
    signalTargetNodes: [{ index: 7 + 3 * width, id: 0 }],
  };
}
