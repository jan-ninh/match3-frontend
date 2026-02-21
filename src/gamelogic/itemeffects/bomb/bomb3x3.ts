import type { EngineEvent, EngineState } from '../../types';
import type { CascadePreStep } from '../../cascade/typesCascade';

import { clearCellsAndPieces } from '../../cascade/clear';
import { applyGravity } from '../../cascade/gravity';
import { applyRefill } from '../../cascade/refill';
import { applyStoneTileDamageAtIndices } from '../../board/obstacles/stoneTile';

export type BombTarget = { x: number; y: number };

export type Bomb3x3Result = {
  state: EngineState;
  events: EngineEvent[];
  clearedIndices: number[];
};

/**
 * Returns the affected board indices for a 3×3 blast centered on `center`.
 *
 * IMPORTANT:
 * - center is allowed to be *off-grid* by 1 cell: x/y ∈ [-1..w]×[-1..h]
 * - result is clipped to valid board indices
 *
 * This enables "edge precision", e.g. center at (1,-1) hits only the top row (0,0)(1,0)(2,0).
 */
export function getBomb3x3IndicesFromTarget(center: BombTarget, width: number, height: number): number[] {
  const cx = center.x | 0;
  const cy = center.y | 0;

  const out = new Set<number>();

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;

      if (x < 0 || x >= width) continue;
      if (y < 0 || y >= height) continue;

      out.add(y * width + x);
    }
  }

  return [...out.values()];
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
 * - For bomb3x3 we preserve current acceptance semantics: if indices exist, we return a step
 *   (even if clearedCount === 0), so the engine can still run the same pipeline + emit observability.
 * - If indices are empty (off-board), returns [].
 */
export function getBomb3x3PreSteps(state: EngineState, center: BombTarget): CascadePreStep[] {
  const indices = getBomb3x3IndicesFromTarget(center, state.width, state.height);
  if (indices.length === 0) return [];

  return [
    {
      kind: 'itemBomb3x3Blast',
      center: { x: center.x | 0, y: center.y | 0 },
      indices,
    },
  ];
}

export function applyBomb3x3(state: EngineState, center: BombTarget): Bomb3x3Result {
  const indices = getBomb3x3IndicesFromTarget(center, state.width, state.height);

  if (indices.length === 0) return { state, events: [], clearedIndices: [] };

  // 3x3 blast damages stone tiles
  let next = state;
  if ((next.stoneTilesTotal | 0) > 0) {
    next = applyStoneTileDamageAtIndices(next, indices, 3);
  }

  const clearedCount = countClearablePieces(next, indices);

  next = clearCellsAndPieces(next, indices);
  next = applyGravity(next);

  const refill = applyRefill(next);

  const events: EngineEvent[] = [];
  if (clearedCount > 0) events.push({ type: 'cleared', count: clearedCount });

  // Parity: even in direct-apply mode, emit first-class observability event.
  events.push({
    type: 'cascadeStep',
    kind: 'itemBomb3x3Blast',
    center: { x: center.x | 0, y: center.y | 0 },
    indices,
    cleared: clearedCount,
  });

  events.push({ type: 'gravity' });
  events.push({ type: 'refilled', count: refill.spawned });

  return { state: refill.state, events, clearedIndices: indices };
}
