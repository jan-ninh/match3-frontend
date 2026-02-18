import type { EngineEvent, EngineState } from '../../types';
import type { CascadePreStep } from '../../cascade/typesCascade';

import { clearCellsAndPieces } from '../../cascade/clear';
import { applyGravity } from '../../cascade/gravity';
import { applyRefill } from '../../cascade/refill';

export type LaserTarget = { x: number; y: number };

export type LaserRowResult = {
  state: EngineState;
  events: EngineEvent[];
  clearedIndices: number[];
  row: number;
};

export function getLaserRowIndicesFromTarget(target: LaserTarget, width: number, height: number): number[] {
  const row = target.y | 0;
  if (row < 0 || row >= height) return [];

  const out: number[] = [];
  for (let x = 0; x < width; x++) out.push(row * width + x);
  return out;
}

function countClearablePieces(state: EngineState, indices: number[]): number {
  let count = 0;

  for (const idx of indices) {
    const c = state.cells[idx];
    if (!c || c.blocked) continue;

    // Obstacles are cleared by their own mechanics
    // chargedCell is passable and can hold pieces -> must be cleared normally.
    if (c.obstacle && c.obstacle.kind !== 'chargedCell') continue;

    if (c.pieceId !== null) count++;
  }

  return count;
}

/**
 * Plan-first API: returns preSteps to be processed as a first-class cascade step.
 * - If nothing clearable is on that row -> returns [] (no-op)
 */
export function getLaserRowPreSteps(state: EngineState, target: LaserTarget): CascadePreStep[] {
  const indices = getLaserRowIndicesFromTarget(target, state.width, state.height);
  if (indices.length === 0) return [];

  const clearedCount = countClearablePieces(state, indices);
  if (clearedCount === 0) return [];

  return [{ kind: 'itemLaserRowClear', row: target.y | 0, indices }];
}

/**
 * Direct apply (clear -> gravity -> refill).
 * Used as fallback for non-preStep call sites.
 */
export function applyLaserRow(state: EngineState, target: LaserTarget): LaserRowResult {
  const indices = getLaserRowIndicesFromTarget(target, state.width, state.height);

  if (indices.length === 0) return { state, events: [], clearedIndices: [], row: target.y | 0 };

  const clearedCount = countClearablePieces(state, indices);

  let next = clearCellsAndPieces(state, indices);
  next = applyGravity(next);

  const refill = applyRefill(next);

  const events: EngineEvent[] = [];
  if (clearedCount > 0) events.push({ type: 'cleared', count: clearedCount });
  events.push({ type: 'cascadeStep', kind: 'itemLaserRowClear', row: target.y | 0, indices, cleared: clearedCount });
  events.push({ type: 'gravity' });
  events.push({ type: 'refilled', count: refill.spawned });

  return { state: refill.state, events, clearedIndices: indices, row: target.y | 0 };
}
