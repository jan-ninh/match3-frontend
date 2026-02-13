// src/gamelogic/cascade/effects/level02/contamination.ts
import type { EngineState } from '../../../types';
import type { CascadeEffect } from '../typesEffects';
import { getOrthogonalNeighbors } from '../../../board';
import { uniqSorted } from '../selection';

function clearAdjacentContamination(state: EngineState, clearIndices: number[]): { state: EngineState; cleared: number[] } {
  if (clearIndices.length === 0) return { state, cleared: [] };

  const { width, height, cells } = state;
  const clearSet = new Set(clearIndices);
  const toClear: number[] = [];

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === 'contamination') toClear.push(n);
    }
  }

  const unique = uniqSorted(toClear);
  if (unique.length === 0) return { state, cleared: [] };

  const nextCells = cells.slice();
  for (const idx of unique) nextCells[idx] = { blocked: false, pieceId: null };

  return { state: { ...state, cells: nextCells }, cleared: unique };
}

export const contaminationEffect: CascadeEffect = {
  id: 'level02.contaminationClear',
  preClear: ({ state, match, ctx, events }) => {
    const res = clearAdjacentContamination(state, match.clearIndices);
    if (res.cleared.length) {
      events.push({ type: 'contaminationCleared', indices: res.cleared });
    }
    return { state: res.state, ctx };
  },
};
