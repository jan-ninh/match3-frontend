// src/gamelogic/levels.ts
import type { LevelDefinition, PieceType } from './types';
import { deriveSeed } from './rng';

// Slightly smaller palette for early levels => more intentional play near objectives.
const DEFAULT_TYPES: PieceType[] = ['blue', 'green', 'purple', 'orange', 'cyan', 'yellow'];

export function getLevelDefinition(levelId: number): LevelDefinition {
  // Smaller board for Level 1 clarity / faster pacing
  const width = 8;
  const height = 8;

  // Exit gate (2x2) in level 1 only (bottom-right)
  // (6,6) (7,6) (6,7) (7,7)
  const cornerBlocks = levelId === 1 ? [6 + 6 * width, 7 + 6 * width, 6 + 7 * width, 7 + 7 * width] : [];

  // “Nodes” (firewall) must be damaged by making matches adjacent to them.
  // Each node has hp=2 => needs 2 adjacent match-resolves (can be across turns/cascades).
  const hp = 3;
  const firewallNodes =
    levelId === 1
      ? [
          { index: 2 + 2 * width, hp }, // (2,2)
          { index: 5 + 3 * width, hp }, // (5,3)
          { index: 3 + 5 * width, hp }, // (3,5)
        ]
      : [];

  // Gate tiles are blocked cells that become “open” once all nodes are destroyed.
  const gateIndices = levelId === 1 ? cornerBlocks : [];

  // Block the objective tiles themselves (nodes + gate footprint).
  const blockedIndices = levelId === 1 ? [...cornerBlocks, ...firewallNodes.map((n) => n.index)] : cornerBlocks;

  // Tighter than 20 so Level 1 has a little bite.
  const moves = 14;

  const baseSeed = 12345;
  const seed = deriveSeed(baseSeed, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    blockedIndices,
    allowedTypes: DEFAULT_TYPES,
    firewallNodes,
    gateIndices,
    baseSeed: seed,
  };
}
