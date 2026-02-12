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
 * Win: alle 3 Lecks sind sealed (patchProgress >= required)
 * Lose: Moves = 0 (optional: hazard_contamination >= 14 Zellen)
 *
 * Gameplay:
 * - Match neben Leak → spawnt SealKit
 * - Match neben SealKit → triggert Patch auf nächstes offenes Leak
 * - Nach jedem Zug: offene Leaks spreaden 1 Contamination
 * - Match neben Contamination → entfernt sie
 */
export function makeLevel02({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 2;

  const width = 8;
  const height = 8;

  // Leak-Positionen: (x,y), (0,0) oben links
  // Leak A: (1,1) = index 9
  // Leak B: (6,2) = index 22
  // Leak C: (3,6) = index 51
  const leakNodes = [
    { index: 1 + 1 * width, patchStepsRequired: 2 }, // (1,1) = 9
    { index: 6 + 2 * width, patchStepsRequired: 2 }, // (6,2) = 22
    { index: 3 + 6 * width, patchStepsRequired: 2 }, // (3,6) = 51
  ];

  // Leaks blockieren ihre Zellen
  const blockedIndices = leakNodes.map((n) => n.index);

  // Moderate difficulty: 13 moves for 3 leaks with 2 patch steps each
  const moves = 13;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices,
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,

    // Balancing knobs
    maxSealKitsOnBoard: 3, // max 3 kits on board at once
    contaminationLoseThreshold: 14, // lose if 14+ cells contaminated
    spreadEveryNTurns: 1, // spread every turn
  };
}
