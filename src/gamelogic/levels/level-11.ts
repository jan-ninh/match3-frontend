// src/gamelogic/levels/level-11.ts
/**
 * Level 11 — based on Level 03 ("TIBERIUM RUN")
 *
 * Mechanic:
 * - Each match "infects" the board with a transparent green trace (charged floor).
 * - The green trace is purely a visual overlay; gameplay remains normal match-3.
 *
 * Level 11 differences:
 * - No central blocked 2×2 crater (middle is open).
 * - No Signal A/B nodes (we'll re-couple win conditions later).
 */
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

export function makeLevel11({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 11;

  const width = 8;
  const height = 8;

  // Level 11: no central crater / no middle blockades.
  const blockedIndices: number[] = [];

  const moves = 12;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices,

    // No Level 01 mechanics
    firewallNodes: [],
    gateIndices: [],

    // No Level 02 mechanics
    leakNodes: [],

    // No Level 03 terminal/keycard mechanics (this level reuses the slot)
    terminalNodes: [],
    keycardNodes: [],

    // No Level 04 mechanics
    objectiveTerminalNodes: [],
    sweepEnabled: false,

    baseSeed: seed,
  };
}
