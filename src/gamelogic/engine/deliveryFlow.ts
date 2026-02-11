// src/gamelogic/engine/deliveryFlow.ts
import type { Cell, EngineEvent, EngineState, PieceId } from '../types';
import { getTerminalAt } from '../board';

/**
 * Check for keycard delivery to open terminals.
 * Called after board stabilizes (all cascades complete).
 *
 * A keycard is delivered if:
 * - It's in a cell with an open terminal
 * - The terminal becomes verified, keycard is consumed
 */
export function processKeycardDeliveries(state: EngineState): { state: EngineState; events: EngineEvent[] } {
  const { cells, pieces } = state;
  const events: EngineEvent[] = [];

  let nextCells = cells;
  let nextPieces = pieces;
  let changed = false;
  let deliveredCount = 0;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell) continue;

    const terminal = getTerminalAt(nextCells, i);
    if (!terminal || terminal.state !== 'open') continue;

    const pid = cell.pieceId;
    if (pid === null) continue;

    const piece = pieces[pid];
    if (!piece || piece.type !== 'keycard') continue;

    // Delivery!
    if (!changed) {
      nextCells = cells.slice();
      nextPieces = { ...pieces };
      changed = true;
    }

    // Remove keycard
    delete nextPieces[pid];

    // Update terminal to verified
    nextCells[i] = {
      ...nextCells[i]!,
      pieceId: null,
      obstacle: { ...terminal, state: 'verified' },
    };

    deliveredCount++;

    events.push({ type: 'keycardDelivered', terminalId: terminal.id, keycardIndex: i });
    events.push({ type: 'terminalVerified', terminalId: terminal.id });
  }

  if (!changed) {
    return { state, events };
  }

  return {
    state: {
      ...state,
      cells: nextCells,
      pieces: nextPieces,
      keycardsDelivered: state.keycardsDelivered + deliveredCount,
      terminalsVerified: state.terminalsVerified + deliveredCount,
    },
    events,
  };
}
