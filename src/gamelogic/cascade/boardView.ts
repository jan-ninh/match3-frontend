// src/gamelogic/cascade/boardView.ts
import type { Cell, Piece, PieceId } from '../types';

export type BoardView = {
  width: number;
  height: number;
  cells: Cell[];
  pieces: Record<PieceId, Piece>;
};

export function makeBoardView(width: number, height: number, cells: Cell[], pieces: Record<PieceId, Piece>): BoardView {
  return { width, height, cells, pieces };
}
