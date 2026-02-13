import { xyOf } from '@/gamelogic';
import type { Axis, PressState } from './typesInput';

import { sign } from '../lib/math';
import { LOCK_DOMINANCE, LOCK_THRESHOLD, RELOCK_DOMINANCE } from '../lib/constants';

export function decideAxisIfNeeded(p: PressState): void {
  const ax = Math.abs(p.rawDx);
  const ay = Math.abs(p.rawDy);

  if (Math.max(ax, ay) < LOCK_THRESHOLD) return;

  if (p.axis === null) {
    if (ax >= ay * LOCK_DOMINANCE) p.axis = 'x';
    else if (ay >= ax * LOCK_DOMINANCE) p.axis = 'y';
    return;
  }

  if (p.axis === 'x') {
    if (ay >= ax * RELOCK_DOMINANCE) p.axis = 'y';
  } else {
    if (ax >= ay * RELOCK_DOMINANCE) p.axis = 'x';
  }
}

export function computeMagnetTarget(args: {
  fromIndex: number;
  axis: Axis;
  rawDx: number;
  rawDy: number;
  width: number;
  height: number;
  canSwapAt: (from: number, to: number) => boolean;
}): number | null {
  const { fromIndex, axis, rawDx, rawDy, width, height, canSwapAt } = args;

  const dir = axis === 'x' ? sign(rawDx) : sign(rawDy);
  if (dir === 0) return null;

  const offset = axis === 'x' ? dir : dir * width;
  const to = fromIndex + offset;

  if (to < 0 || to >= width * height) return null;

  // prevent wrap on x
  if (axis === 'x') {
    const { x: fx } = xyOf(fromIndex, width);
    const { x: tx } = xyOf(to, width);
    if (Math.abs(tx - fx) !== 1) return null;
  }

  if (!canSwapAt(fromIndex, to)) return null;

  return to;
}
