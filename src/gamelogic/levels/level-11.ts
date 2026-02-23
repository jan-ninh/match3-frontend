// src/gamelogic/levels/level-11.ts
/**
 * Level 11 — based on Level 03 ("TIBERIUM RUN")
 *
 * Mechanic:
 * - Each match "infects" the board with a transparent green trace (charged floor).
 * - The green trace is purely a visual overlay; gameplay remains normal match-3.
 *
 * Win: Orthogonal path of charged cells connects Point A (left edge) to Point B (right edge).
 * Lose: Moves = 0
 *
 * Difference vs Level 03:
 * - No central blocked 2×2 crater (middle is open).
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

  // ─────────────────────────────────────────────
  // Point A & Point B (Signal Source & Target)
  // ─────────────────────────────────────────────
  // A (left edge): (0,6) = index 48
  // B (right edge): (7,1) = index 15
  const signalSourceNodes = [{ index: 0 + 6 * width, id: 0 }];
  const signalTargetNodes = [{ index: 7 + 1 * width, id: 0 }];

  // ─────────────────────────────────────────────
  // Board Geometry
  // ─────────────────────────────────────────────
  // Level 11: no central crater / no middle blockades.
  const blockedIndices: number[] = [];

  // ─────────────────────────────────────────────
  // Balancing
  // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // Signal Network (A -> B)
    // ─────────────────────────────────────────────
    signalSourceNodes,
    signalTargetNodes,
  };
}
