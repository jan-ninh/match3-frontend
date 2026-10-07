import type { CascadeEffect } from '../typesEffects';

export const collectProgressEffect: CascadeEffect = {
  id: 'collect.progress',

  preClear: ({ state, match, ctx, events }) => {
    const targetType = state.collectPieceType;
    const target = state.collectTarget | 0;

    // Initial board stabilization must never count toward the player's objective.
    if (!targetType || target <= 0 || state.phase === 'init') return { state, ctx };

    let gained = 0;
    const seen = new Set<number>();

    for (const rawIndex of match.clearIndices) {
      const index = rawIndex | 0;
      if (seen.has(index)) continue;
      seen.add(index);

      const pieceId = state.cells[index]?.pieceId;
      if (pieceId == null) continue;

      if (state.pieces[pieceId]?.type === targetType) gained++;
    }

    if (gained <= 0) return { state, ctx };

    const count = Math.min(target, (state.collectCount | 0) + gained);
    events.push({ type: 'collectProgress', pieceType: targetType, gained, count, target });

    return {
      state: {
        ...state,
        collectCount: count,
      },
      ctx,
    };
  },
};