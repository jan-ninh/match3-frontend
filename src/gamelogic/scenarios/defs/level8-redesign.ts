import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange'];

/**
 * Stage 8 redesign: Signal Breach.
 *
 * Phase 1: connect the two dormant firewall endpoints with charged cells.
 * Phase 2: once linked, both HP1 firewalls become active and must be destroyed.
 */
export function makeLevel8RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 8;
  const width = 8;
  const height = 8;

  const firewallNodes = [
    { index: 0 + 3 * width, hp: 0, maxHp: 1, origin: 'level4Dormant' as const },
    { index: 7 + 3 * width, hp: 0, maxHp: 1, origin: 'level4Dormant' as const },
  ];

  return {
    id: levelId,
    width,
    height,
    baseSeed: deriveSeed(baseSeed, levelId),

    moves: 22,
    movesLoseEnabled: true,
    swapSpendsMove: true,

    allowedTypes: [...LEVEL_TYPES],

    objectiveTitle: 'Signal Breach',

    blockedIndices: [],
    firewallNodes,
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    signalSourceNodes: [],
    signalTargetNodes: [],

    itemObstacleDamage: {
      laserRow: { firewall: { mode: 'direct', damage: 1 } },
      bomb3x3: { firewall: { mode: 'direct', damage: 1 } },
    },
  };
}
