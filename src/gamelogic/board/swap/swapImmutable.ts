// src/gamelogic/board/swap/swapImmutable.ts
import type { Cell, Piece, PieceId } from '../../types';

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
