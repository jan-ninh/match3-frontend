import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Experimental Stage 3 replacement.
 *
 * Progression from Stages 1-2:
 * - keep the familiar four-color board
 * - introduce the first spatial obstacle
 * - five HP1 spikes are destroyed by matching orthogonally adjacent
 */
export function makeLevel3RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 3;

  return {
    id: levelId,
    width: 8,
    height: 8,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 20,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Break the Firewall',

    blockedIndices: [],
    firewallSpawn: {
      count: 5,
      hp: 1,
      policy: 'noTriples8',
      avoidBorder: true,
    },
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    itemObstacleDamage: {
      laserRow: { firewall: { mode: 'direct', damage: 1 } },
      bomb3x3: { firewall: { mode: 'direct', damage: 1 } },
    },
  };
}
