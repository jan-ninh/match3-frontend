// src/gamelogic/levels/level-06.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 06 — PATCH THE HOLE
 *
 * Moved from old Level 02 because it was too hard for early progression.
 *
 * Theme/Objective:
 * - 3 open leaks pump contamination each turn.
 * - Win: seal all leaks (progress >= required).
 * - Lose: out of moves (plus optional contamination threshold).
 *
 * Gameplay:
 * - Match beside a Leak → can spawn a Seal Kit.
 * - Match beside a Seal Kit → seals the nearest open Leak.
 * - After each turn-end: each open Leak spreads 1 Contamination.
 * - Match beside Contamination → clears it.
 */
export function makeLevel06({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const id = 6;

  const width = 8;
  const height = 8;

  // Leak positions (x,y), (0,0) top-left
  // Leak A: (1,1) = index 9
  // Leak B: (6,2) = index 22
  // Leak C: (3,6) = index 51
  const leakNodes = [
    { index: 1 + 1 * width, patchStepsRequired: 2 },
    { index: 6 + 2 * width, patchStepsRequired: 2 },
    { index: 3 + 6 * width, patchStepsRequired: 2 },
  ];

  const moves = 13;
  const seed = deriveSeed(baseSeed, id);

  return {
    id,
    width,
    height,
    moves,
    allowedTypes,
    baseSeed: seed,

    // Leaks are obstacles, not void cells.
    blockedIndices: [],

    firewallNodes: [],
    gateIndices: [],

    leakNodes,

    terminalNodes: [],
    keycardNodes: [],

    // Balancing knobs
    maxSealKitsOnBoard: 3,
    contaminationLoseThreshold: 14,
    spreadEveryNTurns: 1,
  };
}
