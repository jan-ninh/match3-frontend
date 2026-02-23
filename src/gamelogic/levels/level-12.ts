// src/gamelogic/levels/level-12.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

type MakeLevelLike01Args = {
  levelId: number;
  baseSeed: number;
  allowedTypes: PieceType[];
};

export function makeLevelLike01({ levelId, baseSeed, allowedTypes }: MakeLevelLike01Args): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
  };
}

export function makeLevel12({ baseSeed, allowedTypes }: Args): LevelDefinition {
  // Level 12

  const levelId = 12;

  const width = 8;
  const height = 8;

  const moves = 999;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices: [],
    allowedTypes,
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
    // Items damage
    // (mode: 'direct') or (mode: 'adjacent')
    itemObstacleDamage: {
      laserRow: { firewall: { mode: 'direct', damage: 1 } }, // prettier-ignore
      bomb3x3:  { firewall: { mode: 'direct', damage: 1 } }, // prettier-ignore
    },
  };
}
