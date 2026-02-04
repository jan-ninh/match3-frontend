import type { MutableRefObject } from 'react';
import type { DebugSnapshot } from '@/devtools';
import type { PressState } from './types';

export function makeInitialDebugSnapshot(): DebugSnapshot {
  return {
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
}

export function setDebugInactive(ref: MutableRefObject<DebugSnapshot>, canDebug: boolean): void {
  if (!canDebug) return;

  ref.current = {
    ...ref.current,
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
}

export function setDebugStart(
  ref: MutableRefObject<DebugSnapshot>,
  canDebug: boolean,
  args: { pointerId: number; draggable: boolean; fromIndex: number },
): void {
  if (!canDebug) return;

  ref.current = {
    active: true,
    pointerId: args.pointerId,
    draggable: args.draggable,
    fromIndex: args.fromIndex,
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
}

export function updateDebugFromPress(ref: MutableRefObject<DebugSnapshot>, canDebug: boolean, p: PressState): void {
  if (!canDebug) return;

  ref.current = {
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