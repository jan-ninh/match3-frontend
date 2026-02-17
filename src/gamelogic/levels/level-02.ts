// src/gamelogic/levels/level-02.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 02 — BREACH PROTOCOL
 *
 * Theme:
 * - First "real" breach mission after the CLEAN ROOM tutorial.
 * - Crack 3 Firewall Nodes (HP2) by matching orthogonally adjacent.
 *
 * Notes:
 * - Uses the existing firewallNodes/breach mechanic (same as Level 01),
 *   but with higher HP so HUD will treat it as "nodes" (not "spikes").
 */
export function makeLevel02({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const id = 2;

  // Same board size as early levels, but with a small "shape" to reduce noise.
  const width = 8;
  const height = 8;

  // Blocked corner cells (2x2) bottom-right:
  // (6,6) (7,6) (6,7) (7,7)
  const cornerBlocks = [6 + 6 * width, 7 + 6 * width, 6 + 7 * width, 7 + 7 * width];

  // Nodes: HP2 each (progression from Level 01 spikes HP1).
  const hp = 2;
  const firewallNodes = [
    { index: 2 + 2 * width, hp }, // (2,2)
    { index: 5 + 3 * width, hp }, // (5,3)
    { index: 3 + 5 * width, hp }, // (3,5)
  ];

  const gateIndices: number[] = [];

  // Block corner voids + objective tiles (nodes are blocked until breached).
  const blockedIndices = [...cornerBlocks, ...firewallNodes.map((n) => n.index)];

  // Slightly more breathing room than Level 01.
  const moves = 13;

  const seed = deriveSeed(baseSeed, id);

  return {
    id,
    width,
    height,
    moves,
    blockedIndices,
    allowedTypes,
    firewallNodes,
    gateIndices,
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
  };
}
