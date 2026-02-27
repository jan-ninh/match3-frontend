import type { EngineEvent, EngineState } from '../types';
import { getTerminalAt } from '../board';

/**
 * Check for keycard delivery to open terminals.
 * Called after board stabilizes (all cascades complete).
 *
 * Default delivery rule (legacy):
 * - Keycard is delivered if it occupies the same cell as an OPEN terminal.
 *
 * Optional delivery rule (for blocker terminals):
 * - If terminal.blocksPiece===true OR terminal.deliverFromAbove===true, a keycard is delivered
 *   from the cell directly ABOVE the terminal (same column).
 *
 * On delivery:
 * - Terminal becomes verified
 * - Keycard is consumed
 */
export function processKeycardDeliveries(state: EngineState): { state: EngineState; events: EngineEvent[] } {
  const { cells, pieces, width } = state;
  const events: EngineEvent[] = [];

  let nextCells = cells;
  let nextPieces = pieces;
  let changed = false;
  let deliveredCount = 0;

  for (let i = 0; i < cells.length; i++) {
    const cell = nextCells[i];
    if (!cell) continue;

    const terminal = getTerminalAt(nextCells, i);
    if (!terminal || terminal.state !== 'open') continue;

    const deliverFromAbove = terminal.deliverFromAbove === true || terminal.blocksPiece === true;
    const keycardCellIndex = deliverFromAbove ? i - width : i;

    if (keycardCellIndex < 0) continue;

    const keyCell = nextCells[keycardCellIndex];
    if (!keyCell) continue;

    const pid = keyCell.pieceId;
    if (pid === null) continue;

    const piece = nextPieces[pid];
    if (!piece || piece.type !== 'keycard') continue;

    // Delivery!
    if (!changed) {
      nextCells = cells.slice();
      nextPieces = { ...pieces };
      changed = true;
    }

    // Remove keycard
    delete nextPieces[pid];

    // Clear keycard from its cell (same cell for legacy; above cell for blocker terminals)
    nextCells[keycardCellIndex] = { ...nextCells[keycardCellIndex]!, pieceId: null };

    // Update terminal to verified (terminal cell never holds the keycard for blocker terminals)
    nextCells[i] = {
      ...nextCells[i]!,
      pieceId: null,
      obstacle: { ...terminal, state: 'verified' },
    };

    deliveredCount++;

    events.push({ type: 'keycardDelivered', terminalId: terminal.id, keycardIndex: keycardCellIndex });
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
