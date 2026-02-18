// src/gamelogic/cascade/effects/level07/matchRushProgress.ts
import type { CascadeEffect, PreClearArgs } from '../typesEffects';

function computeGroupSizes(width: number, height: number, indices: readonly number[]): number[] {
  if (indices.length === 0) return [];

  const set = new Set<number>(indices);
  const visited = new Set<number>();
  const sizes: number[] = [];

  for (const start of indices) {
    if (visited.has(start)) continue;
    if (!set.has(start)) continue;

    let size = 0;
    const q: number[] = [start];
    visited.add(start);

    while (q.length > 0) {
      const idx = q.pop()!;
      size++;

      const x = idx % width;
      const y = (idx / width) | 0;

      const neighbors: number[] = [];
      if (x > 0) neighbors.push(idx - 1);
      if (x < width - 1) neighbors.push(idx + 1);
      if (y > 0) neighbors.push(idx - width);
      if (y < height - 1) neighbors.push(idx + width);

      for (const n of neighbors) {
        if (!set.has(n)) continue;
        if (visited.has(n)) continue;
        visited.add(n);
        q.push(n);
      }
    }

    sizes.push(size);
  }

  return sizes;
}

function addUnitsForGroupSize(size: number, w3: number, w4: number, w5: number): number {
  if (size >= 5) return w5;
  if (size === 4) return w4;
  if (size === 3) return w3;
  return 0;
}

export const matchRushProgressEffect: CascadeEffect = {
  id: 'level07/matchRushProgress',

  preClear: (args: PreClearArgs) => {
    const { state, match, ctx } = args;

    // Static toggle: only active when configured by the level.
    if (state.matchRushTargetUnits <= 0) {
      return { state, ctx };
    }

    const sizes = computeGroupSizes(state.width, state.height, match.clearIndices);

    let add = 0;
    for (const s of sizes) {
      add += addUnitsForGroupSize(s, state.matchRushW3, state.matchRushW4, state.matchRushW5);
    }

    if (add <= 0) {
      return { state, ctx };
    }

    const nextUnitsRaw = state.matchRushUnits + add;
    const nextUnits =
      state.matchRushTargetUnits > 0 ? Math.min(nextUnitsRaw, state.matchRushTargetUnits) : nextUnitsRaw;

    return {
      state: {
        ...state,
        matchRushUnits: nextUnits,
      },
      ctx,
    };
  },
};
