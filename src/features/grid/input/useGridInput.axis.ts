import { xyOf } from '@/gamelogic';
import { LOCK_DOMINANCE, LOCK_THRESHOLD, RELOCK_DOMINANCE } from '../lib/constants';
import { sign } from '../lib/math';
import type { Axis, PressState } from './types';

export function decideAxisIfNeeded(p: PressState): void {
  const ax = Math.abs(p.rawDx);
  const ay = Math.abs(p.rawDy);

  if (Math.max(ax, ay) < LOCK_THRESHOLD) return;

  if (p.axis === null) {
    if (ax >= ay * LOCK_DOMINANCE) {
      p.axis = 'x';
    } else if (ay >= ax * LOCK_DOMINANCE) {
      p.axis = 'y';
    }
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
  const dir = args.axis === 'x' ? sign(args.rawDx) : sign(args.rawDy);
  if (dir === 0) return null;

  const offset = args.axis === 'x' ? dir : dir * args.width;
  const to = args.fromIndex + offset;

  if (to < 0 || to >= args.width * args.height) return null;

  if (args.axis === 'x') {
    const { x: fx } = xyOf(args.fromIndex, args.width);
    const { x: tx } = xyOf(to, args.width);
    if (Math.abs(tx - fx) !== 1) return null;
  }

  if (!args.canSwapAt(args.fromIndex, to)) return null;

  return to;
}