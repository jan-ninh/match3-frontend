// src/gamelogic/levels/level-03.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level 03 — FALSE IDENTITY
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
 *
 * Skill-Fokus:
 * - Setup-Entscheidung: erst Terminal öffnen vs. erst Keycard positionieren
 * - Board-Lesen: Matches so legen, dass sie adjacent zum Terminal sind UND die richtige Farbe enthalten
 * - Micro-Routing: Keycard sinnvoll "parken", ohne Charge-Aufbau zu blockieren
 */
export function makeLevel03({ baseSeed, allowedTypes }: Args): LevelDefinition {
  const levelId = 3;

  const width = 8;
  const height = 8;

  // ─────────────────────────────────────────────
  // Terminal-Positionen: unterer Rand
  // ─────────────────────────────────────────────
  // Terminal A: (2,7) = index 58, ChargeColor: blue
  // Terminal B: (5,7) = index 61, ChargeColor: green
  const terminalNodes = [
    {
      index: 2 + 7 * width, // (2,7) = 58
      id: 0,
      requiredCharge: 2,
      chargeColor: 'blue' as PieceType,
    },
    {
      index: 5 + 7 * width, // (5,7) = 61
      id: 1,
      requiredCharge: 2,
      chargeColor: 'green' as PieceType,
    },
  ];

  // ─────────────────────────────────────────────
  // Keycard-Positionen: oben
  // ─────────────────────────────────────────────
  // Keycard 1: (2,1) = index 10
  // Keycard 2: (5,1) = index 13
  const keycardNodes = [
    { index: 2 + 1 * width }, // (2,1) = 10
    { index: 5 + 1 * width }, // (5,1) = 13
  ];

  // ─────────────────────────────────────────────
  // Board Geometry
  // ─────────────────────────────────────────────
  // Keine zusätzlich geblockten Zellen
  // (Optional für Harder Mode: 2×2 Ecke bottom-right blocken)
  const blockedIndices: number[] = [];

  // ─────────────────────────────────────────────
  // Balancing
  // ─────────────────────────────────────────────
  // Default: 14 Moves (moderate difficulty)
  // Leichter: 15-16 Moves oder requiredCharge: 1
  // Härter: 12-13 Moves oder requiredCharge: 3
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

    // Level 01 mechanics (nicht verwendet in L03)
    firewallNodes: [],
    gateIndices: [],

    // Level 02 mechanics (nicht verwendet in L03)
    leakNodes: [],

    // Level 03 mechanics
    terminalNodes,
    keycardNodes,

    baseSeed: seed,
  };
}
