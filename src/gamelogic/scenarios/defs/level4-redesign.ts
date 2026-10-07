import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Experimental Stage 4 replacement.
 *
 * Progression from Stage 3:
 * - same four-color board
 * - fewer obstacles, but each now has 2 HP
 * - matching orthogonally adjacent damages a node
 */
export function makeLevel4RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 4;
  const width = 8;
  const height = 8;
  const hp = 2;

  const firewallNodes = [
    { index: 2 + 2 * width, hp },
    { index: 5 + 3 * width, hp },
    { index: 3 + 5 * width, hp },
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

    objectiveTitle: 'Breach the Nodes',

    blockedIndices: firewallNodes.map((node) => node.index),
    firewallNodes,
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
