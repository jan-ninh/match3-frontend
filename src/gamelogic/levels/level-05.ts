import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 05 — FALSE IDENTITY (Deliver ID Cards)
 *
 * Current iteration:
 * - Two adjacent terminals at bottom center: (3,7) and (4,7)
 * - Terminals start OPEN (accept keycard deliveries immediately)
 * - Terminals are configured as:
 *   - indestructible (obstacles are never cleared by matches/items)
 *   - unswappable (swapBlocked)
 *   - blocker (blocksPiece) + pass-through (passThrough)
 *     => pieces cannot occupy the terminal cell, but gravity flow does not split the column.
 *   - keycard delivery is detected from the cell directly ABOVE the terminal (deliverFromAbove)
 *
 * Win condition (engine): deliver a keycard to each terminal (verified: 2/2)
 */
export function makeLevel05({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 5;

  const width = 8;
  const height = 8;

  // ─────────────────────────────────────────────
  // Terminal positions: bottom row center pair
  // ─────────────────────────────────────────────
  // A: (3,7) = index 59
  // B: (4,7) = index 60
  //
  // requiredCharge: 0  => terminals start OPEN (see engine/state.ts)
  // chargeColor: kept for type compatibility (not used when requiredCharge=0)
  const terminalNodes = [
    {
      index: 3 + 7 * width, // (3,7) = 59
      id: 0,
      requiredCharge: 0,
      chargeColor: 'blue' as PieceType,
      swapBlocked: true,
      blocksPiece: true,
      passThrough: true,
      deliverFromAbove: true,
    },
    {
      index: 4 + 7 * width, // (4,7) = 60
      id: 1,
      requiredCharge: 0,
      chargeColor: 'blue' as PieceType,
      swapBlocked: true,
      blocksPiece: true,
      passThrough: true,
      deliverFromAbove: true,
    },
  ];

  // ─────────────────────────────────────────────
  // Keycards at init: none (added later)
  // ─────────────────────────────────────────────
  const keycardNodes: Array<{ index: number }> = [];

  // Board geometry
  const blockedIndices: number[] = [];

  // Balancing
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  // Spawnable types: never spawn keycard randomly
  const spawnableTypes = allowedTypes.filter((t) => t !== 'keycard');

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes: spawnableTypes,
    blockedIndices,

    // Level 01 mechanics
    firewallNodes: [],
    gateIndices: [],

    // Level 02 mechanics
    leakNodes: [],

    // Level 03 mechanics
    terminalNodes,
    keycardNodes,

    // No Level 04 mechanics
    objectiveTerminalNodes: [],
    sweepEnabled: false,

    baseSeed: seed,

    // No Signal mechanics
    signalSourceNodes: [],
    signalTargetNodes: [],
  };
}
