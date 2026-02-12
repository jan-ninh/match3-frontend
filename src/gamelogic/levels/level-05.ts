// src/gamelogic/levels/level-05.ts
/**
 * Level 05 — "SIGNAL HIJACK"
 *
 * Fantasy/Theme:
 * - Hack an internal network by building a conductive path
 * - Source (uplink) must connect to Target (relay) via charged cells
 * - Matches charge the cells they occur on
 *
 * Win: Orthogonal path of charged cells connects Source to Target
 * Lose: Moves = 0
 *
 * Skill Focus:
 * - Route planning: not "match anywhere" but lay a corridor trace
 * - Chokepoint building: cells you can repeatedly service
 * - Setup rewards: cascades can charge multiple segments at once
 */
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

export function makeLevel05({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 5;

  const width = 8;
  const height = 8;

  // ─────────────────────────────────────────────
  // Signal Source & Target Positions
  // ─────────────────────────────────────────────
  // Source (S): (1,6) = index 1 + 6*8 = 49
  // Target (T): (6,1) = index 6 + 1*8 = 14
  // Diagonal distance forces creative routing
  const signalSourceNodes = [{ index: 1 + 6 * width, id: 0 }];
  const signalTargetNodes = [{ index: 6 + 1 * width, id: 0 }];

  // ─────────────────────────────────────────────
  // Blocked Cells: 2×2 block bottom-right corner
  // ─────────────────────────────────────────────
  // (6,6), (7,6), (6,7), (7,7) = indices 54, 55, 62, 63
  const blockedIndices = [
    6 + 6 * width, // 54
    7 + 6 * width, // 55
    6 + 7 * width, // 62
    7 + 7 * width, // 63
  ];

  // ─────────────────────────────────────────────
  // Balancing
  // ─────────────────────────────────────────────
  // 15 moves: moderate difficulty for building ~10-12 cell path
  const moves = 15;

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

    // No Level 03 mechanics
    terminalNodes: [],
    keycardNodes: [],

    // No Level 04 mechanics
    objectiveTerminalNodes: [],
    sweepEnabled: false,

    baseSeed: seed,

    // ─────────────────────────────────────────────
    // Level 05 specific: Signal Network
    // ─────────────────────────────────────────────
    signalSourceNodes,
    signalTargetNodes,
  };
}
