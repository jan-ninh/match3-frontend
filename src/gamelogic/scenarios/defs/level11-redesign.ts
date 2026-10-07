import type { LevelDefinition, PieceType } from '../../types';
import { deriveSeed } from '../../rng';
import type { ScenarioFactoryArgs } from '../registry';

const LEVEL_TYPES: PieceType[] = ['cyan', 'blue', 'purple', 'orange', 'red'];

/**
 * Stage 11 redesign: Core Breach.
 *
 * Campaign finale:
 * - build a charged path between the two dormant firewall endpoints
 * - linked firewalls activate at HP2
 * - destroy both while the familiar laser sweep disrupts the board
 *
 * No extra contamination or firewall hazards are spawned.
 */
export function makeLevel11RedesignScenario({ baseSeed }: ScenarioFactoryArgs): LevelDefinition {
  const levelId = 11;
  const width = 8;
  const height = 8;

  const firewallNodes = [
    { index: 0 + 3 * width, hp: 0, maxHp: 2, origin: 'level4Dormant' as const },
    { index: 7 + 3 * width, hp: 0, maxHp: 2, origin: 'level4Dormant' as const },
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

    objectiveTitle: 'Core Breach',

    blockedIndices: [],
    firewallNodes,
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    signalSourceNodes: [],
    signalTargetNodes: [],

    sweepEnabled: true,
    sweepContaminationCount: 0,
    sweepFirewallCount: 0,
    sweepEveryNTurns: 3,

    itemObstacleDamage: {
      laserRow: { firewall: { mode: 'direct', damage: 1 } },
      bomb3x3: { firewall: { mode: 'direct', damage: 1 } },
    },
  };
}
