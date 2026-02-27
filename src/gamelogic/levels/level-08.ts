import type { LevelDefinition, PieceType } from '../types';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Stage 08: Laser setup (moved from previous Stage 09).
 * Goal: 3× create a Match4+ as a cascade effect after using Row-Laser.
 */
export function makeLevel08({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 999;

  return {
    id: 8,
    width,
    height,
    baseSeed,

    moves,
    allowedTypes,

    objectiveTitle: '3× Match4+ after Row Laser',
    laserRowMatch4Target: 3,

    // Item clears should not progress objective mechanics via cascade effects.
    itemObjectivesDefault: 'noObjectives',

    // Move policy: swaps do NOT spend moves; laserRow confirm spends 1 move (tracked for backend).
    movesLoseEnabled: false,
    swapSpendsMove: false,

    // Timer: 60s to first success, then 50s, then 30s.
    level9TimerStartSec: 60,
    level9TimerAfterFirstSec: 50,
    level9TimerAfterSecondSec: 30,

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],

    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
  };
}
