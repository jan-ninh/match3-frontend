import type { LevelDefinition, Piece, PieceId } from '../../types';
import { initRngState } from '../../rng';
import type { BuildBoardResult } from './typesBuild';
import { initCellsFromLevel } from './initCellsFromLevel';
import { pickSpawnType } from './spawnPicker';
import { resolveRandomFirewalls } from './resolveRandomFirewalls';

function lcg32(x: number): number {
  // Deterministic 32-bit LCG (same behavior across JS runtimes via Math.imul).
  return (Math.imul(1664525, x) + 1013904223) >>> 0;
}

function collectReservedIndices(level: LevelDefinition): Set<number> {
  const reserved = new Set<number>();

  for (const i of level.blockedIndices) reserved.add(i | 0);
  for (const n of level.firewallNodes) reserved.add(n.index | 0);
  for (const i of level.gateIndices) reserved.add(i | 0);
  for (const n of level.leakNodes) reserved.add(n.index | 0);
  for (const n of level.terminalNodes) reserved.add(n.index | 0);
  for (const n of level.keycardNodes) reserved.add(n.index | 0);
  for (const n of level.objectiveTerminalNodes ?? []) reserved.add(n.index | 0);
  for (const n of level.signalSourceNodes ?? []) reserved.add(n.index | 0);
  for (const n of level.signalTargetNodes ?? []) reserved.add(n.index | 0);
  for (const n of level.stoneTileNodes ?? []) reserved.add(n.index | 0);

  return reserved;
}

function isFarEnough(a: number, b: number, width: number): boolean {
  const ax = a % width;
  const ay = Math.floor(a / width);
  const bx = b % width;
  const by = Math.floor(b / width);

  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);

  // Rule: at least 2 columns AND at least 2 rows apart.
  return dx >= 2 && dy >= 2;
}

function resolveLevel04DormantFirewalls(level: LevelDefinition, seed: number): LevelDefinition {
  if (level.id !== 4) return level;

  // Allow explicit overrides (for testing / future variants).
  if (level.firewallNodes.length > 0) return level;

  const reserved = collectReservedIndices(level);

  const size = (level.width | 0) * (level.height | 0);
  const candidates: number[] = [];

  for (let i = 0; i < size; i++) {
    if (reserved.has(i)) continue;
    candidates.push(i);
  }

  if (candidates.length < 2) return level;

  let r = (seed >>> 0) || 1;

  r = lcg32(r);
  const first = candidates[r % candidates.length]!;

  r = lcg32(r);
  const start = r % candidates.length;

  let second = candidates[start]!;
  for (let step = 0; step < candidates.length; step++) {
    const idx = candidates[(start + step) % candidates.length]!;
    if (idx === first) continue;
    if (isFarEnough(first, idx, level.width)) {
      second = idx;
      break;
    }
  }

  if (second === first) {
    for (const idx of candidates) {
      if (idx !== first) {
        second = idx;
        break;
      }
    }
  }

  return {
    ...level,
    firewallNodes: [
      { index: first, hp: 0, maxHp: 1, origin: 'level4Dormant' },
      { index: second, hp: 0, maxHp: 1, origin: 'level4Dormant' },
    ],
  };
}

export function buildInitialBoard(level: LevelDefinition, seed: number): BuildBoardResult {
  const withRandom = resolveRandomFirewalls(level, seed);
  const resolvedLevel = resolveLevel04DormantFirewalls(withRandom, seed);

  const { width, height, allowedTypes } = resolvedLevel;

  let rngState = initRngState(seed);

  const cells = initCellsFromLevel(resolvedLevel);

  const pieces: Record<PieceId, Piece> = {};
  let nextPieceId = 0;

  const size = width * height;

  for (let index = 0; index < size; index++) {
    if (cells[index].blocked) continue;
    if (cells[index].obstacle) continue;

    const picked = pickSpawnType(rngState, allowedTypes, index, width, cells, pieces);
    rngState = picked.rngState;

    const id = nextPieceId as PieceId;
    nextPieceId++;

    pieces[id] = { id, type: picked.chosen, cellIndex: index };
    cells[index].pieceId = id;
  }

  return { cells, pieces, nextPieceId, rngState };
}
