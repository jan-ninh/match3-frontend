import type { PieceId } from '@/gamelogic';
import type { Axis, InputIntent, PressState } from './types-input';

import { DRAG_THRESHOLD, PREVIEW_LOCK_RATIO, PREVIEW_RELEASE_RATIO, SMOOTHING, tileDist } from '../lib/constants';
import { clamp, sign } from '../lib/math';
import { decideAxisIfNeeded, computeMagnetTarget } from './policies';

export type PressEffect =
  | { type: 'setDragPieceId'; value: PieceId | null }
  | { type: 'setIsDragging'; value: boolean }
  | { type: 'setOverIndexUI'; value: number | null }
  | { type: 'setShakePieceId'; value: PieceId | null }
  | { type: 'setPreview'; active: boolean; otherPieceId: PieceId | null; axis: Axis | null; dir: -1 | 0 | 1 }
  | { type: 'setDragDelta'; dx: number; dy: number }
  | { type: 'setDragBaseFromPiece'; pieceId: PieceId; cellIndex: number } // for dragBasePxRef in hook
  | { type: 'ensureRafRunning' }
  | { type: 'stopRaf' }
  | { type: 'snapBackDraggedPiece' }
  | { type: 'clearDragRefs' }
  | { type: 'intent'; intent: InputIntent };

type BeginArgs = {
  inputLocked: boolean;
  pointerId: number;
  clientX: number;
  clientY: number;
  index: number;
  cell: { blocked: boolean; pieceId: PieceId | null } | undefined;
};

type MoveEnv = {
  width: number;
  height: number;
  canSwapAt: (from: number, to: number) => boolean;
  // for dragBase effect
  getPieceById: (id: PieceId) => { cellIndex: number } | null;
  // for preview latch
  getCellPieceId: (index: number) => PieceId | null;
};

type MoveArgs = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type EndArgs = {
  pointerId: number;
  cancelled: boolean;
};

function clearPreviewEffects(): PressEffect[] {
  return [{ type: 'setPreview', active: false, otherPieceId: null, axis: null, dir: 0 }];
}

export function beginPress(args: BeginArgs): { press: PressState | null; effects: PressEffect[] } {
  const { inputLocked, pointerId, clientX, clientY, index, cell } = args;
  if (inputLocked) return { press: null, effects: [] };

  const pid = cell?.pieceId ?? null;
  const draggable = !!cell && !cell.blocked && pid !== null;

  const press: PressState = {
    active: true,
    pointerId,
    fromIndex: index,

    captureEl: null, // keep in hook (we set it there)

    draggable,
    pieceId: draggable ? (pid as PieceId) : null,

    startClientX: clientX,
    startClientY: clientY,

    rawDx: 0,
    rawDy: 0,

    smoothedDx: 0,
    smoothedDy: 0,

    hasExceededThreshold: false,

    axis: null,
    toIndex: null,

    previewLatched: false,
    previewAxis: null,
    previewDir: 0,
    previewToIndex: null,
  };

  const effects: PressEffect[] = [
    { type: 'setDragPieceId', value: draggable ? (pid as PieceId) : null },
    { type: 'setIsDragging', value: false },
    { type: 'setOverIndexUI', value: null },
    ...clearPreviewEffects(),
    { type: 'setDragDelta', dx: 0, dy: 0 },
  ];

  return { press, effects };
}

export function movePress(press: PressState | null, env: MoveEnv, args: MoveArgs): { press: PressState | null; effects: PressEffect[] } {
  if (!press || !press.active) return { press, effects: [] };
  if (press.pointerId !== args.pointerId) return { press, effects: [] };
  if (!press.draggable || press.pieceId === null) return { press, effects: [] };

  const effects: PressEffect[] = [];

  const rawDx = args.clientX - press.startClientX;
  const rawDy = args.clientY - press.startClientY;

  press.rawDx = rawDx;
  press.rawDy = rawDy;

  const dist = Math.hypot(rawDx, rawDy);

  // threshold -> start dragging
  if (!press.hasExceededThreshold && dist >= DRAG_THRESHOLD) {
    press.hasExceededThreshold = true;
    effects.push({ type: 'setIsDragging', value: true });

    const currentPiece = env.getPieceById(press.pieceId);
    if (currentPiece) {
      effects.push({ type: 'setDragBaseFromPiece', pieceId: press.pieceId, cellIndex: currentPiece.cellIndex });
    }

    effects.push({ type: 'ensureRafRunning' });
  }

  // pre-threshold: just update delta/debug
  if (!press.hasExceededThreshold) {
    return { press, effects };
  }

  // axis lock policy
  decideAxisIfNeeded(press);

  if (press.axis === null) {
    press.toIndex = null;
    effects.push({ type: 'setOverIndexUI', value: null });

    if (press.previewLatched) {
      press.previewLatched = false;
      press.previewAxis = null;
      press.previewDir = 0;
      press.previewToIndex = null;
      effects.push(...clearPreviewEffects());
    }

    press.smoothedDx = press.smoothedDx + (0 - press.smoothedDx) * SMOOTHING;
    press.smoothedDy = press.smoothedDy + (0 - press.smoothedDy) * SMOOTHING;

    effects.push({ type: 'setDragDelta', dx: press.smoothedDx, dy: press.smoothedDy });
    return { press, effects };
  }

  // magnet target
  press.toIndex = computeMagnetTarget({
    fromIndex: press.fromIndex,
    axis: press.axis,
    rawDx: press.rawDx,
    rawDy: press.rawDy,
    width: env.width,
    height: env.height,
    canSwapAt: env.canSwapAt,
  });

  effects.push({ type: 'setOverIndexUI', value: press.toIndex });

  const axisDelta = press.axis === 'x' ? press.rawDx : press.rawDy;
  const dir = sign(axisDelta);
  const progress = Math.abs(axisDelta) / tileDist;

  const canPreview = press.toIndex !== null && dir !== 0;

  // unlatch rules
  if (press.previewLatched) {
    const mismatchAxis = press.previewAxis !== press.axis;
    const mismatchTo = press.previewToIndex !== press.toIndex;
    const mismatchDir = press.previewDir !== dir;

    if (!canPreview || mismatchAxis || mismatchTo || mismatchDir) {
      press.previewLatched = false;
      press.previewAxis = null;
      press.previewDir = 0;
      press.previewToIndex = null;
      effects.push(...clearPreviewEffects());
    } else if (progress < PREVIEW_RELEASE_RATIO) {
      press.previewLatched = false;
      press.previewAxis = null;
      press.previewDir = 0;
      press.previewToIndex = null;
      effects.push(...clearPreviewEffects());
    }
  }

  // latch rules
  if (!press.previewLatched) {
    if (canPreview && progress >= PREVIEW_LOCK_RATIO && press.toIndex !== null) {
      const otherPid = env.getCellPieceId(press.toIndex);
      if (otherPid !== null) {
        press.previewLatched = true;
        press.previewAxis = press.axis;
        press.previewDir = dir;
        press.previewToIndex = press.toIndex;

        effects.push({ type: 'setPreview', active: true, otherPieceId: otherPid, axis: press.axis, dir });
      }
    }
  }

  // smoothing + clamp
  if (press.axis === 'x') {
    const desired = press.previewLatched ? tileDist * (press.previewDir || dir) : clamp(press.rawDx, -tileDist, tileDist);
    press.smoothedDx = press.smoothedDx + (desired - press.smoothedDx) * SMOOTHING;
    press.smoothedDy = press.smoothedDy + (0 - press.smoothedDy) * SMOOTHING;
  } else {
    const desired = press.previewLatched ? tileDist * (press.previewDir || dir) : clamp(press.rawDy, -tileDist, tileDist);
    press.smoothedDy = press.smoothedDy + (desired - press.smoothedDy) * SMOOTHING;
    press.smoothedDx = press.smoothedDx + (0 - press.smoothedDx) * SMOOTHING;
  }

  effects.push({ type: 'setDragDelta', dx: press.smoothedDx, dy: press.smoothedDy });

  return { press, effects };
}

export function endPress(
  press: PressState | null,
  env: { canSwapAt: (from: number, to: number) => boolean },
  args: EndArgs,
): { press: PressState | null; effects: PressEffect[] } {
  if (!press || !press.active) return { press, effects: [] };
  if (press.pointerId !== args.pointerId) return { press, effects: [] };

  const effects: PressEffect[] = [];

  const fromIndex = press.fromIndex;
  const draggable = press.draggable;

  // cancelled OR not draggable OR never exceeded threshold => treat as click
  if (args.cancelled || !draggable || !press.hasExceededThreshold) {
    effects.push({ type: 'stopRaf' }, { type: 'clearDragRefs' });
    effects.push({ type: 'setDragPieceId', value: null });
    effects.push({ type: 'setIsDragging', value: false });
    effects.push({ type: 'setOverIndexUI', value: null });
    effects.push(...clearPreviewEffects());

    if (!args.cancelled) effects.push({ type: 'intent', intent: { type: 'click', index: fromIndex } });

    return { press: null, effects };
  }

  const toIndex = press.previewLatched ? press.previewToIndex : null;

  if (toIndex === null) {
    effects.push({ type: 'snapBackDraggedPiece' });
    effects.push({ type: 'stopRaf' }, { type: 'clearDragRefs' });
    effects.push({ type: 'setDragPieceId', value: null });
    effects.push({ type: 'setIsDragging', value: false });
    effects.push({ type: 'setOverIndexUI', value: null });
    effects.push(...clearPreviewEffects());
    return { press: null, effects };
  }

  if (!env.canSwapAt(fromIndex, toIndex)) {
    effects.push({ type: 'snapBackDraggedPiece' });
    effects.push({ type: 'stopRaf' }, { type: 'clearDragRefs' });
    effects.push({ type: 'setDragPieceId', value: null });
    effects.push({ type: 'setIsDragging', value: false });
    effects.push({ type: 'setOverIndexUI', value: null });
    effects.push(...clearPreviewEffects());

    if (press.pieceId !== null) effects.push({ type: 'setShakePieceId', value: press.pieceId });

    return { press: null, effects };
  }

  // valid swap intent
  effects.push({ type: 'stopRaf' }, { type: 'clearDragRefs' });
  effects.push({ type: 'setDragPieceId', value: null });
  effects.push({ type: 'setIsDragging', value: false });
  effects.push({ type: 'setOverIndexUI', value: null });
  effects.push(...clearPreviewEffects());
  effects.push({ type: 'intent', intent: { type: 'swap', from: fromIndex, to: toIndex } });

  return { press: null, effects };
}
