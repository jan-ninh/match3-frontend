// src/gamelogic/levels/level-03.ts
/**
 * Level 03 — "TIBERIUM RUN"
 *
 * Fantasy/Theme:
 * - Each match "infects" the board with a transparent tiberium trace (charged floor).
 * - The green trace is purely a visual overlay; gameplay remains normal match-3.
 *
 * Win: Orthogonal path of charged cells connects Point A (left edge) to Point B (right edge).
 * Lose: Moves = 0
 *
 * Skill Focus:
 * - Route planning: build a continuous corridor, not just matches anywhere
 * - Shaping cascades: set up multi-charge segments per move
 */
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

export function makeLevel03({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 3;

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
  // Central 2×2 blocked "crater" to force a non-trivial route.
  // (3,3), (4,3), (3,4), (4,4) = indices 27, 28, 35, 36
  const blockedIndices = [
    3 + 3 * width, // 27
    4 + 3 * width, // 28
    3 + 4 * width, // 35
    4 + 4 * width, // 36
  ];

  // ─────────────────────────────────────────────
  // Balancing
  // ─────────────────────────────────────────────
  // Target feel: exciting, but not overly strict.
  // - 12 moves gives room for routing + some variance from cascades.
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
