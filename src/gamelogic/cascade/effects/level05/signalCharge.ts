// src/gamelogic/cascade/effects/level05/signalCharge.ts
/**
 * Level 05: Signal Network - Charge cells where matches occur
 *
 * After clear: mark all matched cell positions as "charged"
 * Charged cells form the conductive path from Source to Target
 *
 * Design decision: We apply charge in preClear so we know which
 * cell indices were involved in the match. The pieces will be
 * cleared after, but the chargedCell obstacle remains.
 */
import type { CascadeEffect, PreClearArgs, StageResult } from '../effectTypes';
import type { Cell } from '../../../types';

/**
 * Check if a cell can become charged.
 * Cannot charge: blocked cells, special obstacles (source/target), already charged
 */
function canChargeCell(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  // These obstacles cannot be overwritten with charge
  switch (obs.kind) {
    case 'signalSource':
    case 'signalTarget':
    case 'chargedCell':
    case 'firewall':
    case 'gate':
    case 'leak':
    case 'contamination':
    case 'sealKit':
    case 'terminal':
    case 'objectiveTerminal':
      return false;
    default:
      return false;
  }
}

export const signalChargeEffect: CascadeEffect = {
  id: 'signalCharge',

  /**
   * Pre-clear: capture match positions and mark them as charged
   *
   * Why preClear? Because we need the match indices before pieces are removed.
   * The chargedCell obstacle will persist after the piece is cleared.
   */
  preClear({ state, match, ctx, events }: PreClearArgs): StageResult {
    // Skip if no signal mechanics
    if ((state.signalSourcesTotal ?? 0) === 0 && (state.signalTargetsTotal ?? 0) === 0) {
      return { state, ctx };
    }

    const clearIndices = match.clearIndices;
    if (clearIndices.length === 0) {
      return { state, ctx };
    }

    // Identify cells to charge (those that CAN be charged)
    const toCharge: number[] = [];
    for (const idx of clearIndices) {
      const cell = state.cells[idx];
      if (cell && canChargeCell(cell)) {
        toCharge.push(idx);
      }
    }

    if (toCharge.length === 0) {
      return { state, ctx };
    }

    // Mark cells as charged
    const nextCells = state.cells.slice();
    let chargedCount = state.chargedCellCount ?? 0;

    for (const idx of toCharge) {
      const cell = nextCells[idx]!;

      // Double-check not already charged (defensive)
      if (cell.obstacle?.kind !== 'chargedCell') {
        // Important: keep pieceId intact - clear phase will remove it
        // We just add the chargedCell obstacle
        nextCells[idx] = {
          blocked: false, // chargedCell is passable
          pieceId: cell.pieceId, // keep piece reference for clear phase
          obstacle: { kind: 'chargedCell' },
        };
        chargedCount++;
        events.push({ type: 'cellCharged', index: idx });
      }
    }

    return {
      state: { ...state, cells: nextCells, chargedCellCount: chargedCount },
      ctx,
    };
  },
};
