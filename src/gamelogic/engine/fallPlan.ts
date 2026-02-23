import type { FallMove, FallPlan, Piece, PieceId } from '../types';

import { computeFallMoveDelayMs } from './fallingTuning';

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

  // stable order (avoid Object.keys order coupling)
  moves.sort((a, b) => (a.toIndex - b.toIndex) || (a.id - b.id));

  return { moves };
}

export function buildSpawnFallPlan(postPieces: PiecesById, seed: number, width: number): FallPlan {
  return buildFallPlan({ prePieces: {}, postPieces, seed, width });
}

