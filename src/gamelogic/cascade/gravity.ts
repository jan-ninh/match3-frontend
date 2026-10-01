import type { EngineState, Piece, PieceId } from '../types';
import { blocksGravity, canReceiveFallingPiece, terminalCanHoldPiece } from '../board';

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

      if (blocksGravity(c)) {
        writeY = y - 1;
        continue;
      }

      if (c.pieceId === null) continue;

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

  // Enforce “no pieces in blocked/obstacle cells”
  // Exceptions:
  // - chargedCell is passable and can hold pieces (floor overlay)
  // - terminals may hold a piece only when OPEN and not configured as blockers
  for (let i = 0; i < size; i++) {
    const c = nextCells[i]!;

    if (c.blocked) {
      const pid = c.pieceId;
      if (pid !== null) delete nextPieces[pid];
      c.pieceId = null;
      continue;
    }

    const obs = c.obstacle;
    if (!obs) continue;

    if (obs.kind === 'chargedCell') {
      continue;
    }

    if (obs.kind === 'terminal' && terminalCanHoldPiece(obs)) {
      continue;
    }

    const pid = c.pieceId;
    if (pid !== null) delete nextPieces[pid];
    c.pieceId = null;
  }

  return { ...state, cells: nextCells, pieces: nextPieces };
}
