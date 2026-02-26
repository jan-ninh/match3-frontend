// src/gamelogic/levels/level-05.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 05 — FALSE IDENTITY
 *
 * Fantasy/Theme:
 * - "Falsche Identität": Schleuse ID-Keycards ins System ein.
 * - Scanner-Terminals müssen erst "geladen" werden (Charge via adjacent Matches).
 * - Sieg = Setup → Öffnen → Zustellen (nicht kaputtkloppen).
 *
 * Win: beide Terminals haben je 1 Keycard akzeptiert (verified: 2/2)
 * Lose: Moves = 0
 *
 * Gameplay:
 * - 2 Terminals am unteren Rand mit unterschiedlichen ChargeColors
 * - 2 Keycards oben (müssen nach unten zu den Terminals gebracht werden)
 * - Charge Terminal: Match adjacent + Match enthält ChargeColor
 * - Pro Terminal max. +1 Charge pro Zug
 * - Delivery: Keycard in offenes Terminal → verified
 */
export function makeLevel05({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 5;

  const width = 8;
  const height = 8;

  // ─────────────────────────────────────────────
  // Terminal-Positionen: unterer Rand
  // ─────────────────────────────────────────────
  // Neue Terminals (laut GOAL PIN UPDATE):
  // - (3,7) = index 59
  // - (4,7) = index 60
  //
  // "Schloss-Symbol, aber keine 2 HP Slots" => requiredCharge = 1 (1-step unlock)
  const terminalNodes = [
    {
      index: 3 + 7 * width, // (3,7) = 59
      id: 0,
      requiredCharge: 1,
      chargeColor: 'blue' as PieceType,
    },
    {
      index: 4 + 7 * width, // (4,7) = 60
      id: 1,
      requiredCharge: 1,
      chargeColor: 'green' as PieceType,
    },
  ];

  // ─────────────────────────────────────────────
  // Keycard-Positionen
  // ─────────────────────────────────────────────
  // GOAL PIN UPDATE: "Nimm die 2 Schlüssel raus" => keine Keycards im Start-Layout.
  // (Erwartung: Keycards werden später via Gameplay/Events gespawnt.)
  const keycardNodes: { index: number }[] = [];

  // ─────────────────────────────────────────────
  // Board Geometry
  // ─────────────────────────────────────────────
  // Keine zusätzlich geblockten Zellen
  const blockedIndices: number[] = [];

  // ─────────────────────────────────────────────
  // Balancing
  // ─────────────────────────────────────────────
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  // ─────────────────────────────────────────────
  // Spawnable Types
  // ─────────────────────────────────────────────
  // Filter 'keycard' aus allowedTypes für Refill
  // Keycards werden NIE random gespawnt, nur im Level-Startstate platziert
  const spawnableTypes = allowedTypes.filter((t) => t !== 'keycard');

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes: spawnableTypes,
    blockedIndices,

    // Level 01 mechanics (nicht verwendet in L05)
    firewallNodes: [],
    gateIndices: [],

    // Level 02 mechanics (nicht verwendet in L05)
    leakNodes: [],

    // Level 03 mechanics
    terminalNodes,
    keycardNodes,

    // No Level 04 mechanics
    objectiveTerminalNodes: [],
    sweepEnabled: false,

    baseSeed: seed,

    // No Signal mechanics (Level 03 now owns that slot)
    signalSourceNodes: [],
    signalTargetNodes: [],
  };
}
