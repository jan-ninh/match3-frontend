// src/gamelogic/cascade/gravity.ts
import type { EngineState, Piece, PieceId } from '../types';
import { blocksGravity, canReceiveFallingPiece } from '../board';

export function applyGravity(state: EngineState): EngineState {
  const { width, height, cells } = state;

  const nextCells = state.cells.map((c) => ({ ...c, pieceId: null as PieceId | null }));
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  const size = width * height;

  for (let x = 0; x < width; x++) {
    let writeY = height - 1;

    for (let y = height - 1; y >= 0; y--) {
      const idx = y * width + x;
      const c = cells[idx]!;

      // blockers reset the write head
      if (blocksGravity(c)) {
        writeY = y - 1;
        continue;
      }

      if (c.pieceId === null) continue;

      // find next write position in this column
      while (writeY >= 0) {
        const wIdx = writeY * width + x;
        const wc = cells[wIdx]!;
        if (canReceiveFallingPiece(wc)) break;
        writeY--;
      }

      if (writeY < 0) break;

      const targetIdx = writeY * width + x;
      const pid = c.pieceId as PieceId;

      nextCells[targetIdx] = { ...nextCells[targetIdx]!, pieceId: pid };
      nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: targetIdx };

      writeY--;
    }
  }

  // enforce “no pieces in blocked/obstacle cells” (terminal exception: open terminal may hold a piece)
  // IMPORTANT: if we null pieceId, we MUST also delete the corresponding piece entry
  // otherwise we create dangling pieces -> invariant crash.
  for (let i = 0; i < size; i++) {
    const c = nextCells[i]!;

    if (c.blocked) {
      const pid = c.pieceId;
      if (pid !== null) delete nextPieces[pid];
      c.pieceId = null;
      continue;
    }

    if (!c.obstacle) continue;

    if (c.obstacle.kind === 'terminal' && c.obstacle.state === 'open') {
      // keep pieceId if present
      continue;
    }

    const pid = c.pieceId;
    if (pid !== null) delete nextPieces[pid];
    c.pieceId = null;
  }

  return { ...state, cells: nextCells, pieces: nextPieces };
}
