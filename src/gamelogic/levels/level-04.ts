// src/gamelogic/levels/level-04.ts
/**
 * Level 04 — "SIGNAL BREACH"
 *
 * Fantasy/Theme:
 * - Reuse the green trace mechanic (charged floor) to connect Firewall A -> Firewall B.
 * - Two dormant breach firewalls (HP1) are placed at fixed coordinates.
 *   - They start OFF (no glow, not destroyable) until the signal is linked.
 *   - After link: they turn ON (destroyable) and must both be destroyed to win.
 *
 * Win: Signal linked (A->B) AND both firewalls destroyed.
 * Lose: Moves = 0
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

  // ─────────────────────────────────────────────
  // Firewall A & Firewall B (endpoints for the green path)
  // ─────────────────────────────────────────────
  // A: (0,1) => index 8
  // B: (7,5) => index 47
  const firewallNodes = [
    { index: 0 + 1 * width, hp: 0, maxHp: 1, origin: 'level4Dormant' as const },
    { index: 7 + 5 * width, hp: 0, maxHp: 1, origin: 'level4Dormant' as const },
  ];

  // ─────────────────────────────────────────────
  // Board Geometry
  // ─────────────────────────────────────────────
  // No blocked tiles in Level 04.
  const blockedIndices: number[] = [];

  // Balancing: a bit tighter than Level 03 due to the second objective.
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices,

    objectiveTitle: 'Link A→B • Destroy both firewalls',

    // These two are the endpoints and start dormant (hp=0).
    firewallNodes,
    gateIndices: [],

    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    // No boss sweep / objective terminals for this variant
    objectiveTerminalNodes: [],
    sweepEnabled: false,

    baseSeed: seed,

    // Signal nodes are not used in this Level 04 variant.
    signalSourceNodes: [],
    signalTargetNodes: [],
  };
}
