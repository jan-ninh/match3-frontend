// src/gamelogic/cascade/clear.ts
import type { EngineState, Piece, PieceId } from '../types';

export function clearCellsAndPieces(state: EngineState, indices: number[]): EngineState {
  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  for (const idx of indices) {
    const c = nextCells[idx];
    if (!c || c.blocked) continue;

    // Obstacles are cleared by their own mechanics
    // BUT: chargedCell is passable and can hold pieces -> must be cleared normally.
    if (c.obstacle && c.obstacle.kind !== 'chargedCell') continue;

    const pid = c.pieceId;
    if (pid !== null) {
      delete nextPieces[pid];
      nextCells[idx] = { ...c, pieceId: null };
    }
  }

  return { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };
}
