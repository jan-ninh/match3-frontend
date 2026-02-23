/**
 * Charged Cells (green floor overlay)
 *
 * Origin: Level 05 "Signal Network" used chargedCell as the path medium.
 * Now also reused by Level 03 / Level 11 as a pure "green trace" mechanic.
 *
 * Key rule: chargedCell is PASSABLE (pieces may sit on it).
 * Therefore: never set chargedCell as an obstacle BEFORE clear,
 * otherwise clear() might skip those cells (because they are "obstacles").
 *
 * Approach:
 * - preClear: collect indices to charge into ctx.signalChargedIds
 * - postClear: actually mark cells as chargedCell obstacles (floor overlay)
 */
import type { CascadeEffect, PreClearArgs, PostStageArgs, StageResult } from '../typesEffects';
import type { EngineEvent, EngineState } from '../../../types';
import type { Cell } from '../../../types';

/**
 * Can this cell become charged?
 * Cannot charge: blocked cells, special obstacles (source/target), already charged, etc.
 */
function canChargeCell(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  switch (obs.kind) {
    case 'chargedCell':
    case 'signalSource':
    case 'signalTarget':
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

/**
 * Engine-owned helper: mark given indices as chargedCell (passable floor overlay).
 *
 * Used by:
 * - Match-driven charging (via CascadeEffect postClear)
 * - Item-driven charging (laserRow / bomb3x3) after their preStep clear
 */
export function chargeCellsAtIndices(state: EngineState, indices: Iterable<number>, events: EngineEvent[]): EngineState {
  const nextCells = state.cells.slice();
  let chargedCount = state.chargedCellCount ?? 0;
  let didChargeAny = false;

  for (const idx of indices) {
    const cell = nextCells[idx];
    if (!cell) continue;
    if (!canChargeCell(cell)) continue;

    // already charged?
    if (cell.obstacle?.kind === 'chargedCell') continue;

    // chargedCell is passable: keep pieceId (should be null right after clear, but don't assume)
    nextCells[idx] = {
      ...cell,
      obstacle: { kind: 'chargedCell' },
    };

    didChargeAny = true;
    chargedCount++;
    events.push({ type: 'cellCharged', index: idx });
  }

  if (!didChargeAny) return state;

  return { ...state, cells: nextCells, chargedCellCount: chargedCount };
}

export const signalChargeEffect: CascadeEffect = {
  id: 'signalCharge',

  preClear({ state, match, ctx }: PreClearArgs): StageResult {
    if (match.clearIndices.length === 0) return { state, ctx };

    const base = ctx.signalChargedIds ?? new Set<number>();
    const nextChargedIds = new Set<number>(base);

    for (const idx of match.clearIndices) {
      const cell = state.cells[idx];
      if (cell && canChargeCell(cell)) {
        nextChargedIds.add(idx);
      }
    }

    // no change
    if (nextChargedIds.size === base.size) return { state, ctx };

    return { state, ctx: { ...ctx, signalChargedIds: nextChargedIds } };
  },

  postClear({ state, ctx, events }: PostStageArgs): StageResult {
    const chargedIds = ctx.signalChargedIds;
    if (!chargedIds || chargedIds.size === 0) return { state, ctx };

    const nextState = chargeCellsAtIndices(state, chargedIds, events);

    // consume the collected ids (avoid re-processing next stages/loops)
    const nextCtx = { ...ctx };
    delete nextCtx.signalChargedIds;

    if (nextState === state) return { state, ctx: nextCtx };
    return { state: nextState, ctx: nextCtx };
  },
};
