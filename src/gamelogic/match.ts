import type { EngineState, PieceType } from './types';
import { inBounds, xyOf } from './coords';
import { canSwap } from './board/swap/canSwap';

type BoardView = Pick<EngineState, 'width' | 'height' | 'cells' | 'pieces'>;

// ─────────────────────────────────────────────
// Matchable Type Filter
// ─────────────────────────────────────────────

const NON_MATCHABLE_TYPES: Set<PieceType> = new Set(['keycard']);

/**
 * Check if a piece type can participate in matches.
 * Keycards are swappable and fall, but never match.
 */
export function isMatchableType(type: PieceType): boolean {
  return !NON_MATCHABLE_TYPES.has(type);
}

// ─────────────────────────────────────────────
// Type At Helper
// ─────────────────────────────────────────────

function typeAt(board: BoardView, index: number): PieceType | null {
  const cell = board.cells[index];
  if (!cell || cell.blocked || cell.pieceId === null) return null;
  const p = board.pieces[cell.pieceId];
  if (!p) return null;
  // Non-matchable types (e.g., keycard) are invisible to match detection
  if (!isMatchableType(p.type)) return null;
  return p.type;
}

// ─────────────────────────────────────────────
// Direction Count Helper
// ─────────────────────────────────────────────

function countDir(
  board: BoardView,
  start: { x: number; y: number },
  dx: number,
  dy: number,
  t: PieceType,
  getTypeAt: (x: number, y: number) => PieceType | null,
): number {
  let n = 0;
  let x = start.x + dx;
  let y = start.y + dy;
  while (inBounds(x, y, board.width, board.height)) {
    const tt = getTypeAt(x, y);
    if (tt !== t) break;
    n++;
    x += dx;
    y += dy;
  }
  return n;
}

// ─────────────────────────────────────────────
// Match Detection
// ─────────────────────────────────────────────

export type MatchAxis = 'h' | 'v';

export type MatchRun = {
  axis: MatchAxis;
  indices: number[];
  len: number;
};

export type MatchDetection = {
  clearIndices: number[];
  groups: number;
  /**
   * Optional, but when present allows consumers (HUD/SFX) to know the exact match run sizes.
   * Kept optional for backward-compat in code that only cares about clears/groups.
   */
  runs?: MatchRun[];
};

export function detectMatches(board: BoardView): MatchDetection {
  const { width, height } = board;
  const clear = new Set<number>();
  const runs: MatchRun[] = [];

  // horizontal
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const idx = y * width + x;
      const t = typeAt(board, idx);
      if (t === null) {
        x++;
        continue;
      }

      let run = 1;
      while (x + run < width) {
        const idx2 = y * width + (x + run);
        const t2 = typeAt(board, idx2);
        if (t2 !== t) break;
        run++;
      }

      if (run >= 3) {
        const indices: number[] = [];
        for (let k = 0; k < run; k++) {
          const i = y * width + (x + k);
          indices.push(i);
          clear.add(i);
        }
        runs.push({ axis: 'h', indices, len: run });
      }

      x += run;
    }
  }

  // vertical
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      const idx = y * width + x;
      const t = typeAt(board, idx);
      if (t === null) {
        y++;
        continue;
      }

      let run = 1;
      while (y + run < height) {
        const idx2 = (y + run) * width + x;
        const t2 = typeAt(board, idx2);
        if (t2 !== t) break;
        run++;
      }

      if (run >= 3) {
        const indices: number[] = [];
        for (let k = 0; k < run; k++) {
          const i = (y + k) * width + x;
          indices.push(i);
          clear.add(i);
        }
        runs.push({ axis: 'v', indices, len: run });
      }

      y += run;
    }
  }

  const clearIndices = Array.from(clear).sort((a, b) => a - b);
  return { clearIndices, groups: runs.length, runs };
}

// ─────────────────────────────────────────────
// Would Create Match At
// ─────────────────────────────────────────────

export function wouldCreateMatchAt(board: BoardView, index: number, candidate: PieceType): boolean {
  // Non-matchable types never create matches
  if (!isMatchableType(candidate)) return false;

  const { x, y } = xyOf(index, board.width);

  const getTypeAt = (xx: number, yy: number): PieceType | null => {
    const i = yy * board.width + xx;
    if (i === index) return candidate;
    return typeAt(board, i);
  };

  const h = 1 + countDir(board, { x, y }, -1, 0, candidate, getTypeAt) + countDir(board, { x, y }, 1, 0, candidate, getTypeAt);
  if (h >= 3) return true;

  const v = 1 + countDir(board, { x, y }, 0, -1, candidate, getTypeAt) + countDir(board, { x, y }, 0, 1, candidate, getTypeAt);
  return v >= 3;
}

// ─────────────────────────────────────────────
// Would Swap Create Match
// ─────────────────────────────────────────────

export function wouldSwapCreateMatch(board: BoardView, from: number, to: number): boolean {
  const tf = typeAt(board, from);
  const tt = typeAt(board, to);

  // If either piece is non-matchable, check only the matchable one
  // (Keycards can be swapped but won't create matches themselves)
  const fromPiece = board.cells[from]?.pieceId !== null ? board.pieces[board.cells[from]!.pieceId!] : null;
  const toPiece = board.cells[to]?.pieceId !== null ? board.pieces[board.cells[to]!.pieceId!] : null;

  const fromMatchable = fromPiece && isMatchableType(fromPiece.type);
  const toMatchable = toPiece && isMatchableType(toPiece.type);

  // If neither is matchable, no match possible
  if (!fromMatchable && !toMatchable) return false;

  // If only one is matchable, we still need to check if THAT piece creates a match at its new position
  if (tf === null && tt === null) return false;

  const getTypeAfterSwap = (idx: number): PieceType | null => {
    if (idx === from) return tt;
    if (idx === to) return tf;
    return typeAt(board, idx);
  };

  const checkAt = (idx: number): boolean => {
    const t = getTypeAfterSwap(idx);
    if (t === null) return false;
    // Non-matchable types don't form matches
    if (!isMatchableType(t)) return false;

    const { x, y } = xyOf(idx, board.width);

    const getTypeAt = (xx: number, yy: number): PieceType | null => {
      const i = yy * board.width + xx;
      return getTypeAfterSwap(i);
    };

    const h = 1 + countDir(board, { x, y }, -1, 0, t, getTypeAt) + countDir(board, { x, y }, 1, 0, t, getTypeAt);
    if (h >= 3) return true;

    const v = 1 + countDir(board, { x, y }, 0, -1, t, getTypeAt) + countDir(board, { x, y }, 0, 1, t, getTypeAt);
    return v >= 3;
  };

  return checkAt(from) || checkAt(to);
}

// ─────────────────────────────────────────────
// Has Any Moves
// ─────────────────────────────────────────────

export function hasAnyMoves(board: BoardView): boolean {
  const { width, height, cells } = board;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const c = cells[i]!;
      if (c.blocked || c.pieceId === null) continue;

      // right
      if (x + 1 < width) {
        const j = y * width + (x + 1);
        const d = cells[j]!;
        if (!d.blocked && d.pieceId !== null) {
          if (wouldSwapCreateMatch(board, i, j)) return true;
        }
      }

      // down
      if (y + 1 < height) {
        const j = (y + 1) * width + x;
        const d = cells[j]!;
        if (!d.blocked && d.pieceId !== null) {
          if (wouldSwapCreateMatch(board, i, j)) return true;
        }
      }
    }
  }

  return false;
}

// ─────────────────────────────────────────────
// DevTools: Find Possible Match Swaps (read-only)
// ─────────────────────────────────────────────

export type PossibleMatchSwap = Readonly<{
  from: number;
  to: number;
  clearIndices: readonly number[];
  runs: readonly MatchRun[];
}>;

function detectMatchesAfterSwap(board: BoardView, from: number, to: number): MatchDetection {
  const { width, height } = board;

  const tf = typeAt(board, from);
  const tt = typeAt(board, to);

  const typeAtAfterSwap = (idx: number): PieceType | null => {
    if (idx === from) return tt;
    if (idx === to) return tf;
    return typeAt(board, idx);
  };

  const runs: MatchRun[] = [];

  // horizontal
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const idx = y * width + x;
      const t = typeAtAfterSwap(idx);
      if (t === null) {
        x++;
        continue;
      }

      let run = 1;
      while (x + run < width) {
        const idx2 = y * width + (x + run);
        const t2 = typeAtAfterSwap(idx2);
        if (t2 !== t) break;
        run++;
      }

      if (run >= 3) {
        const indices: number[] = [];
        for (let k = 0; k < run; k++) {
          const i = y * width + (x + k);
          indices.push(i);
        }
        runs.push({ axis: 'h', indices, len: run });
      }

      x += run;
    }
  }

  // vertical
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      const idx = y * width + x;
      const t = typeAtAfterSwap(idx);
      if (t === null) {
        y++;
        continue;
      }

      let run = 1;
      while (y + run < height) {
        const idx2 = (y + run) * width + x;
        const t2 = typeAtAfterSwap(idx2);
        if (t2 !== t) break;
        run++;
      }

      if (run >= 3) {
        const indices: number[] = [];
        for (let k = 0; k < run; k++) {
          const i = (y + k) * width + x;
          indices.push(i);
        }
        runs.push({ axis: 'v', indices, len: run });
      }

      y += run;
    }
  }

  // Keep only runs that are actually caused by the swap (i.e. touch either swap index).
  const relevantRuns = runs.filter((r) => r.indices.includes(from) || r.indices.includes(to));

  const clear = new Set<number>();
  for (const r of relevantRuns) {
    for (const i of r.indices) clear.add(i);
  }

  const clearIndices = Array.from(clear).sort((a, b) => a - b);
  return { clearIndices, groups: relevantRuns.length, runs: relevantRuns };
}

/**
 * Enumerate all legal swap-pairs that would create ≥1 match.
 *
 * Policy:
 * - Uses `canSwap(...)` (adjacency + blocked + obstacle passability).
 * - Uses `wouldSwapCreateMatch(...)` (match creation semantics incl. non-matchable types like keycard).
 * - Read-only: does NOT mutate `board` / engine state.
 */
export function findPossibleMatchSwaps(board: BoardView): readonly PossibleMatchSwap[] {
  const { width, height, cells } = board;
  const out: PossibleMatchSwap[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = y * width + x;

      const c = cells[from];
      if (!c || c.blocked || c.pieceId === null) continue;

      // right neighbor
      if (x + 1 < width) {
        const to = from + 1;
        const ok = canSwap(from, to, width, cells).ok;
        if (ok && wouldSwapCreateMatch(board, from, to)) {
          const det = detectMatchesAfterSwap(board, from, to);
          if (det.clearIndices.length > 0 && det.runs) {
            out.push({ from, to, clearIndices: det.clearIndices, runs: det.runs });
          }
        }
      }

      // down neighbor
      if (y + 1 < height) {
        const to = from + width;
        const ok = canSwap(from, to, width, cells).ok;
        if (ok && wouldSwapCreateMatch(board, from, to)) {
          const det = detectMatchesAfterSwap(board, from, to);
          if (det.clearIndices.length > 0 && det.runs) {
            out.push({ from, to, clearIndices: det.clearIndices, runs: det.runs });
          }
        }
      }
    }
  }

  return out;
}
