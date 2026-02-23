import type { EngineState } from '../../types';

/**
 * Mark cleared indices with the enemy red floor mark.
 * SSOT helper to avoid drift between resolveOnce and stabilizeBoard.
 */
export function markEnemyRedAtIndices(state: EngineState, indices: readonly number[]): EngineState {
  if (state.enemyMarkActive !== true) return state;

  let nextCells = state.cells;
  let changed = false;

  for (const idx of indices) {
    const c = nextCells[idx];
    if (!c || c.blocked) continue;

    if (c.mark === 'enemyRed') continue;

    if (!changed) {
      nextCells = state.cells.slice();
      changed = true;
    }

    nextCells[idx] = { ...c, mark: 'enemyRed' };
  }

  if (!changed) return state;
  return { ...state, cells: nextCells };
}
