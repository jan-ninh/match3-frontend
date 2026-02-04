import type { Cell, LevelDefinition, Piece, PieceId, PieceType, SwapRejectReason } from './types';
import { createRng } from './rng';
import { areAdjacent, xyOf } from './coords';

type BuildBoardResult = {
  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  nextPieceId: number;
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

export function buildInitialBoard(level: LevelDefinition): BuildBoardResult {
  const { width, height, allowedTypes } = level;

  const rng = createRng(level.baseSeed);

  const blocked = new Set(level.blockedIndices);
  const size = width * height;

  const cells: Cell[] = Array.from({ length: size }, (_, index) => ({
    blocked: isBlockedIndex(blocked, index),
    pieceId: null,
  }));

  const pieces: Record<PieceId, Piece> = {};
  let nextPieceId = 0;

  for (let index = 0; index < size; index++) {
    if (cells[index].blocked) continue;

    let chosen: PieceType | null = null;

    for (let attempt = 0; attempt < 24; attempt++) {
      const t = allowedTypes[rng.nextInt(allowedTypes.length)]!;
      if (!wouldCreateSpawnTriple(t, index, width, cells, pieces)) {
        chosen = t;
        break;
      }
    }

    if (!chosen) chosen = allowedTypes[rng.nextInt(allowedTypes.length)]!;

    const id = nextPieceId as PieceId;
    nextPieceId++;

    pieces[id] = { id, type: chosen, cellIndex: index };
    cells[index].pieceId = id;
  }

  return { cells, pieces, nextPieceId };
}

export function canSwap(from: number, to: number, width: number, cells: Cell[]): { ok: true } | { ok: false; reason: SwapRejectReason } {
  if (!areAdjacent(from, to, width)) return { ok: false, reason: 'notAdjacent' };

  const a = cells[from];
  const b = cells[to];
  if (!a || !b) return { ok: false, reason: 'empty' };

  if (a.blocked || b.blocked) return { ok: false, reason: 'blocked' };
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