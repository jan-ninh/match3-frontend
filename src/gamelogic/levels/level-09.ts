// src/gamelogic/levels/level-09.ts
import type { LevelDefinition, PieceType } from '../types';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 09: Laser setup.
 * Goal: 3× create a Match4+ as a cascade effect after using Row-Laser.
 */
export function makeLevel09({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 14;

  return {
    id: 9,
    width,
    height,
    baseSeed,

    moves,
    allowedTypes,

    objectiveTitle: '3× Match4+ after Row Laser',
    laserRowMatch4Target: 3,

    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],

    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
  };
}
