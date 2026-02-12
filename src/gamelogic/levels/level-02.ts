// src/gamelogic/levels/level-02.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 02 — PATCH THE HOLE
 *
 * Fantasy/Theme:
 * - "Leckraum": 3 offene Lecks pumpen pro Zug "Contamination" ins System.
 * - Sieg nicht über HP/Damage, sondern über Patchen unter Druck (Contain-Feeling light).
 *
 * Win: alle 3 Lecks sind sealed (progress >= required)
 * Lose: Moves = 0 (optional: hazard_contamination >= threshold)
 *
 * Gameplay:
 * - Match neben Leak → spawnt SealKit
 * - Match neben SealKit → triggert Patch auf nächstes offenes Leak
 * - Nach jedem Zug: offene Leaks spreaden 1 Contamination
 * - Match neben Contamination → entfernt sie
 */
export function makeLevel02({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const id = 2;

  const width = 8;
  const height = 8;

  // Leak-Positionen: (x,y), (0,0) oben links
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

    // IMPORTANT:
    // Leaks are obstacles, not "blocked" void cells.
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
