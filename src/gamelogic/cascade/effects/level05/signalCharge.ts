/**
 * Level 05: Signal Network - Charge cells where matches occur
 *
 * Key rule: charged cells are PASSABLE (pieces may sit on them).
 * Therefore: never set chargedCell as an obstacle BEFORE clear,
 * otherwise clear() would skip those cells (because they are "obstacles").
 *
 * Approach:
 * - preClear: collect indices to charge into ctx.signalChargedIds
 * - postClear: actually mark cells as chargedCell obstacles (floor overlay)
 */
import type { CascadeEffect, PreClearArgs, PostStageArgs, StageResult } from '../effectTypes';
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

export const signalChargeEffect: CascadeEffect = {
  id: 'signalCharge',

  preClear({ state, match, ctx }: PreClearArgs): StageResult {
    // Skip if no signal mechanics
    if ((state.signalSourcesTotal ?? 0) === 0 && (state.signalTargetsTotal ?? 0) === 0) {
      return { state, ctx };
    }

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

    const nextCells = state.cells.slice();
    let chargedCount = state.chargedCellCount ?? 0;
    let didChargeAny = false;

    for (const idx of chargedIds) {
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

    // consume the collected ids (avoid re-processing next stages/loops)
    const nextCtx = { ...ctx };
    delete nextCtx.signalChargedIds;

    if (!didChargeAny) return { state, ctx: nextCtx };

    return { state: { ...state, cells: nextCells, chargedCellCount: chargedCount }, ctx: nextCtx };
  },
};
