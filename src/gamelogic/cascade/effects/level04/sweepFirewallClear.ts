// src/gamelogic/cascade/effects/level04/sweepFirewallClear.ts
import type { EngineState } from '../../../types';
import type { CascadeEffect } from '../effectTypes';
import { getOrthogonalNeighbors } from '../../../board';
import { uniqSorted } from '../selection';

/**
 * Level 04: Sweep-spawned firewalls ("origin: sweep") are destructible by adjacent clears,
 * but MUST NOT touch Level-01 breach counters / gate logic.
 */
function clearAdjacentSweepFirewalls(state: EngineState, clearIndices: number[]): EngineState {
  if (clearIndices.length === 0) return state;

  const { width, height, cells } = state;
  const clearSet = new Set<number>(clearIndices);
  const toClear: number[] = [];

  for (const clearIdx of clearIndices) {
    for (const n of getOrthogonalNeighbors(clearIdx, width, height)) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === 'firewall' && obs.origin === 'sweep') {
        toClear.push(n);
      }
    }
  }

  const unique = uniqSorted(toClear);
  if (unique.length === 0) return state;

  const nextCells = cells.slice();
  for (const idx of unique) {
    nextCells[idx] = { blocked: false, pieceId: null };
  }

  return { ...state, cells: nextCells };
}

export const sweepFirewallClearEffect: CascadeEffect = {
  id: 'level04.sweepFirewallClear',
  preClear: ({ state, match, ctx }) => {
    const next = clearAdjacentSweepFirewalls(state, match.clearIndices);
    return { state: next, ctx };
  },
};
