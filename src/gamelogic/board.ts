// src/gamelogic/board.ts
import type { Cell, CellObstacle, LevelDefinition, Piece, PieceId, PieceType, SwapRejectReason } from './types';
import { initRngState, rngNextInt, type RngState } from './rng';
import { areAdjacent, xyOf } from './coords';

type BuildBoardResult = {
  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  nextPieceId: number;
  rngState: RngState;
};

function isBlockedIndex(blocked: Set<number>, index: number): boolean {
  return blocked.has(index);
}

function getPieceTypeAt(index: number, cells: Cell[], pieces: Record<PieceId, Piece>): PieceType | null {
  const pid = cells[index]?.pieceId ?? null;
  if (pid === null) return null;
  return pieces[pid]?.type ?? null;
}

function wouldCreateSpawnTriple(candidate: PieceType, index: number, width: number, cells: Cell[], pieces: Record<PieceId, Piece>): boolean {
  const { x, y } = xyOf(index, width);

  if (x >= 2) {
    const t1 = getPieceTypeAt(index - 1, cells, pieces);
    const t2 = getPieceTypeAt(index - 2, cells, pieces);
    if (t1 !== null && t2 !== null && t1 === candidate && t2 === candidate) return true;
  }

  if (y >= 2) {
    const t1 = getPieceTypeAt(index - width, cells, pieces);
    const t2 = getPieceTypeAt(index - 2 * width, cells, pieces);
    if (t1 !== null && t2 !== null && t1 === candidate && t2 === candidate) return true;
  }

  return false;
}

export function buildInitialBoard(level: LevelDefinition, seed: number): BuildBoardResult {
  const { width, height, allowedTypes } = level;

  let rngState = initRngState(seed);

  const blocked = new Set(level.blockedIndices);

  const firewallMap = new Map<number, { hp: number }>(level.firewallNodes.map((n) => [n.index, { hp: n.hp }]));
  const gateSet = new Set(level.gateIndices);
  const leakMap = new Map<number, { id: number; required: number }>(level.leakNodes.map((n, i) => [n.index, { id: i, required: n.patchStepsRequired }]));

  // Level 03+: Terminal positions (handled separately in state.ts for clean layering)
  const terminalSet = new Set(level.terminalNodes?.map((n) => n.index) ?? []);

  // Level 03+: Keycard positions (handled separately in state.ts)
  const keycardSet = new Set(level.keycardNodes?.map((n) => n.index) ?? []);

  const size = width * height;

  const cells: Cell[] = Array.from({ length: size }, (_, index) => {
    // Firewall
    const fw = firewallMap.get(index);
    if (fw) {
      return {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'firewall', hp: fw.hp, maxHp: fw.hp },
      };
    }

    // Gate
    if (gateSet.has(index)) {
      return {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'gate', open: false },
      };
    }

    // Leak
    const leak = leakMap.get(index);
    if (leak) {
      return {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'leak', id: leak.id, progress: 0, required: leak.required },
      };
    }

    // Terminal placeholder (actual obstacle set in state.ts)
    // Mark as blocked for initial piece spawn, but don't set obstacle yet
    if (terminalSet.has(index)) {
      return {
        blocked: true,
        pieceId: null,
      };
    }

    // Keycard position: normal cell, piece placed in state.ts
    // Don't block, but we'll replace the random piece with keycard later

    // Normal cell
    return {
      blocked: isBlockedIndex(blocked, index),
      pieceId: null,
    };
  });

  const pieces: Record<PieceId, Piece> = {};
  let nextPieceId = 0;

  for (let index = 0; index < size; index++) {
    if (cells[index].blocked) continue;
    if (cells[index].obstacle) continue;

    let chosen: PieceType | null = null;

    for (let attempt = 0; attempt < 24; attempt++) {
      const r = rngNextInt(rngState, allowedTypes.length);
      rngState = r.state;

      const t = allowedTypes[r.value]!;
      if (!wouldCreateSpawnTriple(t, index, width, cells, pieces)) {
        chosen = t;
        break;
      }
    }

    if (!chosen) {
      const r = rngNextInt(rngState, allowedTypes.length);
      rngState = r.state;
      chosen = allowedTypes[r.value]!;
    }

    const id = nextPieceId as PieceId;
    nextPieceId++;

    pieces[id] = { id, type: chosen, cellIndex: index };
    cells[index].pieceId = id;
  }

  return { cells, pieces, nextPieceId, rngState };
}

// ─────────────────────────────────────────────
// Terminal Helpers
// ─────────────────────────────────────────────

export function getTerminalAt(cells: Cell[], index: number): Extract<CellObstacle, { kind: 'terminal' }> | null {
  const obs = cells[index]?.obstacle;
  return obs?.kind === 'terminal' ? obs : null;
}

export function isTerminalCell(cells: Cell[], index: number): boolean {
  return getTerminalAt(cells, index) !== null;
}

export function canEnterTerminal(cells: Cell[], index: number): boolean {
  const terminal = getTerminalAt(cells, index);
  if (!terminal) return true; // kein Terminal = passierbar (normale Logik)
  return terminal.state === 'open';
}

export function getTerminalIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'terminal') {
      indices.push(i);
    }
  }
  return indices;
}

// ─────────────────────────────────────────────
// Swap Validation
// ─────────────────────────────────────────────

export function canSwap(from: number, to: number, width: number, cells: Cell[]): { ok: true } | { ok: false; reason: SwapRejectReason } {
  if (!areAdjacent(from, to, width)) return { ok: false, reason: 'notAdjacent' };

  const a = cells[from];
  const b = cells[to];
  if (!a || !b) return { ok: false, reason: 'empty' };

  if (a.blocked || b.blocked) return { ok: false, reason: 'blocked' };

  // Obstacle check with terminal exception
  if (a.obstacle) {
    // Terminal cells: can swap FROM if open (keycard leaving)
    if (a.obstacle.kind !== 'terminal' || a.obstacle.state !== 'open') {
      return { ok: false, reason: 'blocked' };
    }
  }

  if (b.obstacle) {
    // Terminal cells: can swap INTO if open (keycard entering)
    if (b.obstacle.kind !== 'terminal' || b.obstacle.state !== 'open') {
      return { ok: false, reason: 'blocked' };
    }
  }

  if (a.pieceId === null || b.pieceId === null) return { ok: false, reason: 'empty' };

  return { ok: true };
}

export function swapCellsImmutable(cells: Cell[], from: number, to: number): Cell[] {
  const next = cells.slice();

  const a = next[from]!;
  const b = next[to]!;

  next[from] = { ...a, pieceId: b.pieceId };
  next[to] = { ...b, pieceId: a.pieceId };

  return next;
}

export function swapPiecesPositionsImmutable(
  pieces: Record<PieceId, Piece>,
  from: number,
  to: number,
  fromPid: PieceId,
  toPid: PieceId,
): Record<PieceId, Piece> {
  return {
    ...pieces,
    [fromPid]: { ...pieces[fromPid]!, cellIndex: to },
    [toPid]: { ...pieces[toPid]!, cellIndex: from },
  };
}

// ─────────────────────────────────────────────
// Utility: Orthogonal neighbors
// ─────────────────────────────────────────────

export function getOrthogonalNeighbors(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors: number[] = [];

  if (x > 0) neighbors.push(index - 1);
  if (x < width - 1) neighbors.push(index + 1);
  if (y > 0) neighbors.push(index - width);
  if (y < height - 1) neighbors.push(index + width);

  return neighbors;
}

// ─────────────────────────────────────────────
// Utility: Manhattan distance
// ─────────────────────────────────────────────

export function manhattanDist(a: number, b: number, width: number): number {
  const ax = a % width;
  const ay = Math.floor(a / width);
  const bx = b % width;
  const by = Math.floor(b / width);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

// ─────────────────────────────────────────────
// Utility: Find nearest open leak
// ─────────────────────────────────────────────

export function getNearestOpenLeakId(fromIndex: number, width: number, cells: Cell[]): number | null {
  let best: { id: number; dist: number } | null = null;

  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (obs?.kind !== 'leak') continue;
    if (obs.progress >= obs.required) continue;

    const dist = manhattanDist(fromIndex, i, width);
    if (!best || dist < best.dist || (dist === best.dist && obs.id < best.id)) {
      best = { id: obs.id, dist };
    }
  }

  return best?.id ?? null;
}

// ─────────────────────────────────────────────
// Utility: Get spread candidates for a leak
// ─────────────────────────────────────────────

export function getSpreadCandidates(leakIndex: number, width: number, height: number, cells: Cell[]): number[] {
  const neighbors = getOrthogonalNeighbors(leakIndex, width, height);

  return neighbors.filter((i) => {
    const cell = cells[i];
    if (!cell) return false;
    if (cell.blocked) return false;
    if (cell.obstacle) return false;
    return true;
  });
}

// ─────────────────────────────────────────────
// Utility: Count contamination cells
// ─────────────────────────────────────────────

export function countContamination(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    if (cell.obstacle?.kind === 'contamination') count++;
  }
  return count;
}

// ─────────────────────────────────────────────
// Utility: Count seal kits on board
// ─────────────────────────────────────────────

export function countSealKits(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    if (cell.obstacle?.kind === 'sealKit') count++;
  }
  return count;
}

// ─────────────────────────────────────────────
// Utility: Check if cell can receive falling piece
// ─────────────────────────────────────────────

export function canReceiveFallingPiece(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  // Terminal: only open terminals can receive pieces
  if (obs.kind === 'terminal') {
    return obs.state === 'open';
  }

  // Other obstacles block falling pieces
  return false;
}

// ─────────────────────────────────────────────
// Utility: Check if cell blocks gravity pass-through
// ─────────────────────────────────────────────

export function blocksGravity(cell: Cell): boolean {
  if (cell.blocked) return true;

  const obs = cell.obstacle;
  if (!obs) return false;

  // Terminal: locked/verified block, open allows pass
  if (obs.kind === 'terminal') {
    return obs.state !== 'open';
  }

  // All other obstacles block gravity
  return true;
}
