import type { EngineState } from './types';
import { canSwap, swapCellsImmutable, swapPiecesPositionsImmutable } from './board';
import { detectMatches } from './match';

export type PossibleSwap = { from: number; to: number };

export function listPossibleMatchSwaps(state: EngineState): PossibleSwap[] {
  const w = state.width;
  const h = state.height;
  const n = w * h;

  const out: PossibleSwap[] = [];

  for (let i = 0; i < n; i++) {
    const cell = state.cells[i];
    if (!cell) continue;
    if (cell.blocked) continue;
    if (cell.pieceId === null) continue;

    const x = i % w;
    const y = Math.floor(i / w);

    const tryPair = (j: number) => {
      const check = canSwap(i, j, w, state.cells);
      if (!check.ok) return;

      const fromPid = state.cells[i]?.pieceId ?? null;
      const toPid = state.cells[j]?.pieceId ?? null;
      if (fromPid === null || toPid === null) return;

      const nextCells = swapCellsImmutable(state.cells, i, j);
      const nextPieces = swapPiecesPositionsImmutable(state.pieces, i, j, fromPid, toPid);

      const nextState: EngineState = { ...state, cells: nextCells, pieces: nextPieces };

      const m = detectMatches(nextState);
      if (m.clearIndices.length > 0) out.push({ from: i, to: j });
    };

    if (x + 1 < w) tryPair(i + 1);
    if (y + 1 < h) tryPair(i + w);
  }

  return out;
}

export function countPossibleMatchSwaps(state: EngineState): number {
  return listPossibleMatchSwaps(state).length;
}
