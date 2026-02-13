// src/gamelogic/cascade/shuffleUntilValid.ts
import type { EngineState, Piece, PieceId } from '../types';
import { detectMatches, hasAnyMoves } from '../match';
import { rngShuffleInPlace } from '../rng';

export function shuffleUntilValid(state: EngineState, maxAttempts: number): { state: EngineState; attempts: number } {
  const indices: number[] = [];
  const pieceIds: PieceId[] = [];

  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i]!;
    if (c.blocked) continue;
    if (c.obstacle) continue;
    if (c.pieceId === null) continue;

    // keycards stay in place
    const p = state.pieces[c.pieceId];
    if (p && p.type === 'keycard') continue;

    indices.push(i);
    pieceIds.push(c.pieceId as PieceId);
  }

  let rngState = state.rngState;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const perm = pieceIds.slice();
    const sh = rngShuffleInPlace(rngState, perm);
    rngState = sh.state;

    const nextCells = state.cells.map((c) => {
      const p = c.pieceId !== null ? state.pieces[c.pieceId] : null;
      if (p && p.type === 'keycard') return { ...c };
      return { ...c, pieceId: null as PieceId | null };
    });

    const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

    for (let k = 0; k < indices.length; k++) {
      const idx = indices[k]!;
      const pid = perm[k]!;
      nextCells[idx] = { ...nextCells[idx]!, pieceId: pid };
      nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: idx };
    }

    const candidate: EngineState = {
      ...state,
      cells: nextCells,
      pieces: nextPieces,
      rngState,
      selectedIndex: null,
    };

    const m = detectMatches(candidate);
    if (m.clearIndices.length !== 0) continue;
    if (!hasAnyMoves(candidate)) continue;

    return { state: candidate, attempts: attempt };
  }

  // deterministic fallback: accept one last shuffle
  const perm = pieceIds.slice();
  const sh = rngShuffleInPlace(rngState, perm);
  rngState = sh.state;

  const nextCells = state.cells.map((c) => {
    const p = c.pieceId !== null ? state.pieces[c.pieceId] : null;
    if (p && p.type === 'keycard') return { ...c };
    return { ...c, pieceId: null as PieceId | null };
  });

  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  for (let k = 0; k < indices.length; k++) {
    const idx = indices[k]!;
    const pid = perm[k]!;
    nextCells[idx] = { ...nextCells[idx]!, pieceId: pid };
    nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: idx };
  }

  return {
    state: { ...state, cells: nextCells, pieces: nextPieces, rngState, selectedIndex: null },
    attempts: maxAttempts,
  };
}
