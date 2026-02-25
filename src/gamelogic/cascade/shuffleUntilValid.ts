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

  const buildCandidate = (perm: PieceId[], nextRngState: EngineState['rngState']): EngineState => {
    // IMPORTANT:
    // Only clear/re-assign pieceIds for cells that are part of the shuffle domain (indices[]).
    // Do NOT blanket-clear other cells, because pieces may legally sit on passable obstacles
    // (e.g. chargedCell, terminal open). Blanket-clearing would orphan those pieces and
    // crash assertBoardIntegrity (piece exists in pieces but not present in its cellIndex).
    const nextCells = state.cells.map((c) => ({ ...c }));

    // Clear shuffle-domain cells first (keep keycards untouched because they were excluded from indices[]).
    for (const idx of indices) {
      const c = nextCells[idx]!;
      nextCells[idx] = { ...c, pieceId: null as PieceId | null };
    }

    const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

    for (let k = 0; k < indices.length; k++) {
      const idx = indices[k]!;
      const pid = perm[k]!;
      nextCells[idx] = { ...nextCells[idx]!, pieceId: pid };
      nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: idx };
    }

    return {
      ...state,
      cells: nextCells,
      pieces: nextPieces,
      rngState: nextRngState,
      selectedIndex: null,
    };
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const perm = pieceIds.slice();
    const sh = rngShuffleInPlace(rngState, perm);
    rngState = sh.state;

    const candidate = buildCandidate(perm, rngState);

    const m = detectMatches(candidate);
    if (m.clearIndices.length !== 0) continue;
    if (!hasAnyMoves(candidate)) continue;

    return { state: candidate, attempts: attempt };
  }

  // deterministic fallback: accept one last shuffle
  const perm = pieceIds.slice();
  const sh = rngShuffleInPlace(rngState, perm);
  rngState = sh.state;

  return {
    state: buildCandidate(perm, rngState),
    attempts: maxAttempts,
  };
}
