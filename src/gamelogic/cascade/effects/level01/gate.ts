// src/gamelogic/cascade/effects/level01/gate.ts
import type { EngineEvent, EngineState } from '../../../types';

export function setGateOpen(state: EngineState, open: boolean, events?: EngineEvent[]): EngineState {
  if (state.gateOpen === open) return state;

  let nextCells = state.cells;
  if (state.gateIndices.length) {
    nextCells = nextCells.slice();
    for (const idx of state.gateIndices) {
      const c = nextCells[idx];
      if (!c) continue;
      nextCells[idx] = { ...c, blocked: true, pieceId: null, obstacle: { kind: 'gate', open } };
    }
  }

  if (open && state.gateIndices.length) events?.push({ type: 'gateOpened' });
  return { ...state, gateOpen: open, cells: nextCells };
}
