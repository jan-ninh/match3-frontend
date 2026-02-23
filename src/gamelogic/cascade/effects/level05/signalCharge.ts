// src/gamelogic/cascade/effects/level05/signalCharge.ts
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
 *
 * Level 11 enemy mode:
 * - Enemy paints cleared slots red via cell.mark='enemyRed'
 * - Player can reclaim red back to green via matches/items:
 *   => when a cell becomes (or already is) chargedCell, we clear enemyRed mark (actor='player' only)
 * - While enemyMarkActive is true, we do NOT apply signal charging (avoid creating green trace on enemy turns)
 */
import type { CascadeEffect, PreClearArgs, PostStageArgs, StageResult } from '../typesEffects';
import type { EngineEvent, EngineState } from '../../../types';
import type { Cell } from '../../../types';

type ChargeActor = 'player' | 'enemy';

/**
 * Can this cell become charged?
 * Cannot charge: blocked cells, special obstacles (source/target), etc.
 *
 * NOTE:
 * - chargedCell is allowed here so we can "reclaim" an enemy-marked charged cell
 *   by clearing its mark (we still won't increment charged count twice).
 */
function canChargeCell(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  switch (obs.kind) {
    case 'chargedCell':
      return true;

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
 *
 * Rule:
 * - If a cell is (or becomes) chargedCell, clear enemyRed mark so PLAYER can reclaim territory.
 * - Actor-aware (Option B): only actor='player' clears enemyRed.
 */
export function chargeCellsAtIndices(state: EngineState, indices: Iterable<number>, events: EngineEvent[], actor: ChargeActor = 'player'): EngineState {
  const nextCells = state.cells.slice();

  const prevChargedCount = state.chargedCellCount;
  let chargedCount = prevChargedCount ?? 0;

  let didChangeAny = false;
  let didChargeNew = false;

  const canReclaimEnemyRed = actor === 'player';

  for (const idx of indices) {
    const cell = nextCells[idx];
    if (!cell) continue;
    if (!canChargeCell(cell)) continue;

    const hasEnemyMark = cell.mark === 'enemyRed';
    const isAlreadyCharged = cell.obstacle?.kind === 'chargedCell';

    // Already charged: allow player reclaim by clearing enemy mark (no re-count, no duplicate event).
    if (isAlreadyCharged) {
      if (hasEnemyMark && canReclaimEnemyRed) {
        nextCells[idx] = { ...cell, mark: undefined };
        didChangeAny = true;
      }
      continue;
    }

    // Not charged yet: apply chargedCell overlay + clear enemy mark if present (player only).
    nextCells[idx] = {
      ...cell,
      obstacle: { kind: 'chargedCell' },
      mark: hasEnemyMark && canReclaimEnemyRed ? undefined : cell.mark,
    };

    didChangeAny = true;
    didChargeNew = true;
    chargedCount++;
    events.push({ type: 'cellCharged', index: idx });
  }

  if (!didChangeAny) return state;

  // Only touch chargedCellCount when we actually charged new cells.
  if (!didChargeNew) return { ...state, cells: nextCells };

  return { ...state, cells: nextCells, chargedCellCount: chargedCount };
}

export const signalChargeEffect: CascadeEffect = {
  id: 'signalCharge',

  preClear({ state, match, ctx }: PreClearArgs): StageResult {
    // Enemy moves should NOT create green trace (and must not wipe red marks).
    if (state.enemyMarkActive === true) return { state, ctx };

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
    // Safety: if something queued ids during enemy mode, drop them.
    if (state.enemyMarkActive === true) {
      const nextCtx = { ...ctx };
      delete nextCtx.signalChargedIds;
      return { state, ctx: nextCtx };
    }

    const chargedIds = ctx.signalChargedIds;
    if (!chargedIds || chargedIds.size === 0) return { state, ctx };

    const nextState = chargeCellsAtIndices(state, chargedIds, events, 'player');

    // consume the collected ids (avoid re-processing next stages/loops)
    const nextCtx = { ...ctx };
    delete nextCtx.signalChargedIds;

    if (nextState === state) return { state, ctx: nextCtx };
    return { state: nextState, ctx: nextCtx };
  },
};
