import type { FallMove, FallPlan, Piece, PieceId } from '../types';

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
      delayMs: computeDelayMs(seed, id, toIndex, width),
      // delayMs: computeDelayMs(seed, id, toIndex, width),
    });
  }

  // stable order (avoid Object.keys order coupling)
  moves.sort((a, b) => a.toIndex - b.toIndex || a.id - b.id);

  return { moves };
}

export function buildSpawnFallPlan(postPieces: PiecesById, seed: number, width: number): FallPlan {
  return buildFallPlan({ prePieces: {}, postPieces, seed, width });
}

function computeDelayMs(seed: number, id: PieceId, toIndex: number, width: number): number {
  const col = width > 0 ? toIndex % width : 0;

  // Deterministic small jitter: 0..40ms in 10ms steps.
  // Chosen to be visually pleasant without affecting gameplay.
  const x = ((seed >>> 0) ^ ((id * 2654435761) >>> 0) ^ ((col * 1597334677) >>> 0)) >>> 0;
  return (x % 5) * 10;
}
