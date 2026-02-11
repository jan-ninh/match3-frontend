// src/gamelogic/levels/level-01.ts
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

/**
 * Level-01 rules template.
 * Use this for early levels so they all share the same structure/objective (for now).
 */
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
    baseSeed: seed,
  };
}

export function makeLevel01({ baseSeed, allowedTypes }: Args): LevelDefinition {
  // Level 1 — CLEAN ROOM (gesetzt)
  // Objective: 4–6 “Spikes” (HP1) entfernen.
  // Regel: Match orthogonal daneben => Spike weg.
  // TECH: wir nutzen die bestehende "firewallNodes"-Mechanik, aber hp=1 + HUD/UI nennen es "spike".

  const levelId = 1;

  const width = 8;
  const height = 8;

  const hp = 1;

  // 5 Spikes (in Range 4–6). Positionen: gut verteilt, nicht nur Rand.
  const firewallNodes = [
    { index: 2 + 2 * width, hp }, // (2,2)
    { index: 5 + 2 * width, hp }, // (5,2)
    { index: 3 + 3 * width, hp }, // (3,3)
    { index: 2 + 5 * width, hp }, // (2,5)
    { index: 5 + 5 * width, hp }, // (5,5)
  ];

  const gateIndices: number[] = [];

  // Spikes sind “blocked” bis sie entfernt werden.
  const blockedIndices = firewallNodes.map((n) => n.index);

  // Druck: 10–12 Moves (empf. 11)
  const moves = 11;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices,
    allowedTypes,
    firewallNodes,
    gateIndices,
    leakNodes: [],
    baseSeed: seed,
  };
}
