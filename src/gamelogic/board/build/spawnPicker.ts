// src/gamelogic/board/build/spawnPicker.ts
import type { Cell, Piece, PieceId, PieceType } from '../../types';
import { rngNextInt, type RngState } from '../../rng';
import { xyOf } from '../../coords';

function getPieceTypeAt(index: number, cells: Cell[], pieces: Record<PieceId, Piece>): PieceType | null {
  const pid = cells[index]?.pieceId ?? null;
  if (pid === null) return null;
  return pieces[pid]?.type ?? null;
}

function wouldCreateSpawnTriple(
  candidate: PieceType,
  index: number,
  width: number,
  cells: Cell[],
  pieces: Record<PieceId, Piece>,
): boolean {
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

export function pickSpawnType(
  rngState: RngState,
  allowedTypes: PieceType[],
  index: number,
  width: number,
  cells: Cell[],
  pieces: Record<PieceId, Piece>,
): { chosen: PieceType; rngState: RngState } {
  let nextState = rngState;

  let chosen: PieceType | null = null;

  for (let attempt = 0; attempt < 24; attempt++) {
    const r = rngNextInt(nextState, allowedTypes.length);
    nextState = r.state;

    const t = allowedTypes[r.value]!;
    if (!wouldCreateSpawnTriple(t, index, width, cells, pieces)) {
      chosen = t;
      break;
    }
  }

  if (!chosen) {
    const r = rngNextInt(nextState, allowedTypes.length);
    nextState = r.state;
    chosen = allowedTypes[r.value]!;
  }

  return { chosen, rngState: nextState };
}
