// src/gamelogic/board/build/types.ts
import type { Cell, Piece, PieceId } from '../../types';
import type { RngState } from '../../rng';

export type BuildBoardResult = {
  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  nextPieceId: number;
  rngState: RngState;
};
