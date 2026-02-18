// src/gamelogic/levels/level-04.ts
/**
 * Level 04 — "FIREWALL SWEEP" (Bossroom)
 *
 * Fantasy/Theme:
 * - Firewall core corridor with AI-controlled sweep scanner
 * - Each turn: one row/column is marked → at turn end it gets "swept" (laser)
 * - Sweep clears pieces on line + spawns hazards (contamination + firewalls)
 *
 * Win: Both objective terminals activated (2/2)
 * Lose: Moves = 0 (optional: contamination >= 12)
 *
 * Terminals charge via adjacent matches (any color, not color-specific).
 * RequiredCharge: 3 per terminal
 */
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

export function makeLevel04({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 4;

  const width = 8;
  const height = 8;

  // Objective Terminals at fixed positions
  // Terminal A: (1,3) = index 1 + 3*8 = 25
  // Terminal B: (6,4) = index 6 + 4*8 = 38
  const objectiveTerminalNodes = [
    { index: 1 + 3 * width, id: 0, requiredCharge: 3 },
    { index: 6 + 4 * width, id: 1, requiredCharge: 3 },
  ];

  // Block terminal cells from initial piece spawn
  const blockedIndices = objectiveTerminalNodes.map((n) => n.index);

  // Boss pressure: 16 moves
  const moves = 16;

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

    // No Level 02 mechanics (sweep creates contamination dynamically)
    leakNodes: [],

    // No Level 03 terminal/keycard mechanics (we use objectiveTerminals)
    terminalNodes: [],
    keycardNodes: [],

    baseSeed: seed,

    // ─────────────────────────────────────────────
    // Level 04 specific: Objective Terminals + Sweep
    // ─────────────────────────────────────────────
    objectiveTerminalNodes,

    // Sweep config
    sweepEnabled: true,
    sweepContaminationCount: 4, // hazards per sweep
    sweepFirewallCount: 2, // firewalls (hp=1) per sweep
    sweepEveryNTurns: 3, // sweeps every n turn

    // Optional hard-lose threshold
    contaminationLoseThreshold: 20,
  };
}
