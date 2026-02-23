import type { FallMove, FallPlan, Piece, PieceId } from '../types';

import { FALLING_TUNING, computeFallMoveDelayMs } from './fallingTuning';

type PiecesById = Readonly<Partial<Record<PieceId, Piece>>>;

type BuildArgs = Readonly<{
  prePieces: PiecesById;
  postPieces: PiecesById;
  seed: number;
  width: number;
}>;

/**
 * Build a deterministic fall plan by diffing piece positions before/after an atomic resolve step.
 * - Existing pieces: fromIndex = pre.cellIndex
 * - Spawned pieces: fromIndex = null
 * - Stationary pieces are omitted
 *
 * NOTE: This does not change game logic — it is a pure derived payload for UI animation.
 */
export function buildFallPlan({ prePieces, postPieces, seed, width }: BuildArgs): FallPlan {
  const moves: FallMove[] = [];

  for (const key of Object.keys(postPieces)) {
    const id = Number(key) as PieceId;
    const post = postPieces[id];
    if (!post) continue;

    const pre = prePieces[id];
    const fromIndex = pre ? pre.cellIndex : null;
    const toIndex = post.cellIndex;

    if (fromIndex !== null && fromIndex === toIndex) continue;

    moves.push({
      id,
      fromIndex,
      toIndex,
      delayMs: computeFallMoveDelayMs(seed, id, toIndex, width),
    });
  }

  // Spawn stacking (visual): ensure spawned tiles in the same column start bottom-first.
  // Uses fall.msPerRow as the natural "one-row step" delay.
  const msPerRow = Math.max(0, Math.min(60_000, Math.floor(FALLING_TUNING.fall.msPerRow)));
  const w = width > 0 ? width : 1;

  if (msPerRow > 0) {
    const maxYByCol = new Map<number, number>();

    for (const mv of moves) {
      if (mv.fromIndex !== null) continue;
      const col = mv.toIndex % w;
      const y = Math.floor(mv.toIndex / w);
      const prev = maxYByCol.get(col);
      if (prev === undefined || y > prev) maxYByCol.set(col, y);
    }

    for (const mv of moves) {
      if (mv.fromIndex !== null) continue;
      const col = mv.toIndex % w;
      const maxY = maxYByCol.get(col);
      if (maxY === undefined) continue;

      const y = Math.floor(mv.toIndex / w);
      const stackDelayMs = (maxY - y) * msPerRow;
      if (stackDelayMs > 0) mv.spawnStackDelayMs = stackDelayMs;
    }
  }

  // stable order (avoid Object.keys order coupling)
  moves.sort((a, b) => (a.toIndex - b.toIndex) || (a.id - b.id));

  return { moves };
}

export function buildSpawnFallPlan(postPieces: PiecesById, seed: number, width: number): FallPlan {
  return buildFallPlan({ prePieces: {}, postPieces, seed, width });
}
