// src/gamelogic/levels/level-04.ts
/**
 * Level 04 — "SIGNAL BREACH"
 *
 * Fantasy/Theme:
 * - Reuse the green trace mechanic (charged floor) to connect Point A -> Point B.
 * - Two dormant breach firewalls (HP1) spawn at init (deterministic per seed).
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
  // Point A & Point B (Signal Source & Target)
  // ─────────────────────────────────────────────
  // Keep positions aligned with Level 03 for consistency.
  // A (left edge): (0,6) = index 48
  // B (right edge): (7,1) = index 15
  const signalSourceNodes = [{ index: 0 + 6 * width, id: 0 }];
  const signalTargetNodes = [{ index: 7 + 1 * width, id: 0 }];

  // ─────────────────────────────────────────────
  // Board Geometry
  // ─────────────────────────────────────────────
  // No blocked tiles in Level 04.
  // (Signal source/target occupy their cells via obstacles in engine init.)
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

    objectiveTitle: 'Link signal • Destroy 2 firewalls',

    // Firewalls are injected deterministically in buildInitialBoard (Level 04 special-case).
    // They start dormant (hp=0, maxHp=1, origin='level4Dormant') and get activated after first signal link.
    firewallNodes: [],
    gateIndices: [],

    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],

    // No boss sweep / objective terminals for this variant
    objectiveTerminalNodes: [],
    sweepEnabled: false,

    baseSeed: seed,

    // Signal Network (A -> B)
    signalSourceNodes,
    signalTargetNodes,
  };
}
