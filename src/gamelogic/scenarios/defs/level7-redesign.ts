import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Stage 7 redesign: simplified Patch the Hole.
 *
 * Two leaks, one patch step each.
 * Contamination spreads only every second turn.
 * No contamination-loss threshold: the mechanic creates pressure
 * without adding a second fail condition.
 */
export function makeLevel7RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 7;
  const width = 8;
  const height = 8;

  return {
    id: levelId,
    width,
    height,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 20,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Patch the Leaks',

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],

    leakNodes: [
      { index: 1 + 2 * width, patchStepsRequired: 1 },
      { index: 6 + 5 * width, patchStepsRequired: 1 },
    ],

    terminalNodes: [],
    keycardNodes: [],

    maxSealKitsOnBoard: 2,
    spreadEveryNTurns: 2,
  };
}
