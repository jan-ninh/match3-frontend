import type { EngineEvent, EngineState } from '../types';

export function isStableIdle(state: Pick<EngineState, 'phase' | 'pendingTurnCommit'>): boolean {
  // NOTE: `phase === 'idle'` may be transiently non-stable while the reducer consumes a pending turn commit.
  return state.phase === 'idle' && state.pendingTurnCommit === null;
}

export function isSelectableCell(state: EngineState, index: number): boolean {
  const cell = state.cells[index];
  if (!cell) return false;
  if (cell.blocked) return false;
  if (cell.pieceId === null) return false;
  return true;
}

export function selectionClearedIfNeeded(prevSelected: number | null, nextSelected: number | null): EngineEvent[] {
  if (prevSelected !== null && nextSelected === null) return [{ type: 'selectionCleared' }];
  return [];
}
