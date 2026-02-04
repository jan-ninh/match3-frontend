import type { DebugSnapshot } from '@/devtools';
import type { PressState } from './types';

export const INITIAL_DEBUG_SNAPSHOT: DebugSnapshot = {
  active: false,
  pointerId: null,
  draggable: false,
  fromIndex: null,
  toIndex: null,
  axis: null,
  exceededThreshold: false,
  rawDx: 0,
  rawDy: 0,
  smoothedDx: 0,
  smoothedDy: 0,
  previewLatched: false,
  previewAxis: null,
  previewDir: 0,
  previewToIndex: null,
};

export function toDebugSnapshot(p: PressState | null): DebugSnapshot {
  if (!p) return { ...INITIAL_DEBUG_SNAPSHOT };

  return {
    active: p.active,
    pointerId: p.pointerId,
    draggable: p.draggable,
    fromIndex: p.fromIndex,
    toIndex: p.toIndex,
    axis: p.axis,
    exceededThreshold: p.hasExceededThreshold,
    rawDx: p.rawDx,
    rawDy: p.rawDy,
    smoothedDx: p.smoothedDx,
    smoothedDy: p.smoothedDy,
    previewLatched: p.previewLatched,
    previewAxis: p.previewAxis,
    previewDir: p.previewDir,
    previewToIndex: p.previewToIndex,
  };
}
