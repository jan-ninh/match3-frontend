import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';

type Args = {
  baseSeed: number;
  allowedTypes: PieceType[];
};

type MakeLevelLike01Args = {
  levelId: number;
  baseSeed: number;
  allowedTypes: PieceType[];
};

/**
 * Level-01 rules template.
 * Use this for early levels so they all share the same structure/objective (for now).
 */
export function makeLevelLike01({ levelId, baseSeed, allowedTypes }: MakeLevelLike01Args): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 14;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes,
    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
  };
}

export function makeLevel01({ baseSeed, allowedTypes }: Args): LevelDefinition {
  // Level 1 — CLEAN ROOM
  // Objective: 5 “Spikes” (HP1) entfernen.
  // Regel: Match orthogonal daneben => Spike nimmt 1 dmg (HP1 => weg).
  // TECH: wir nutzen "firewallNodes"-Mechanik, aber hp=1 + HUD/UI nennen es "spike".
  //
  // Placement:
  // - deterministisch random (seeded) beim State/Board-Build
  // - Constraint: keine 3er-Cluster (8-neighborhood). Erlaubt sind isolierte Singles und isolierte Paare.

  const levelId = 1;

  const width = 8;
  const height = 8;

  const moves = 11;

  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices: [],
    allowedTypes,
    // resolved at init (seeded)
    firewallSpawn: { count: 5, hp: 1, policy: 'noTriples8', avoidBorder: true },
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
    // Items damage
    // (mode: 'direct') or (mode: 'adjacent')
    itemObstacleDamage: {
      laserRow: { firewall: { mode: 'direct', damage: 1 } }, // prettier-ignore
      bomb3x3:  { firewall: { mode: 'direct', damage: 1 } }, // prettier-ignore
    },
  };
}
