// src/features/grid/input/useGridInput.controller.ts
import type { Dispatch, SetStateAction } from 'react';

import type { Cell, Piece, PieceId } from '@/gamelogic';

import type { InputIntent, PressState } from './typesInput';

import { cellPixelXY, clamp, sign } from '../lib/math';
import { DRAG_THRESHOLD, PREVIEW_LOCK_RATIO, PREVIEW_RELEASE_RATIO, SMOOTHING, tileDist } from '../lib/constants';

import { computeMagnetTarget, decideAxisIfNeeded } from './useGridInput.axis';
import type { PreviewUiSetters } from './useGridInput.preview';
import { clearPreviewVisuals, latchPreview, unlatchPreview } from './useGridInput.preview';

type SetState<T> = Dispatch<SetStateAction<T>>;

type PressStore = {
  get: () => PressState | null;
  set: (v: PressState | null) => void;
};

type DebugApi = {
  setInactive: () => void;
  setStart: (args: { pointerId: number; draggable: boolean; fromIndex: number }) => void;
  updateFromPress: (p: PressState) => void;
};

type RafApi = {
  resetForStart: () => void;
  setDragBasePx: (pos: { x: number; y: number } | null) => void;
  setDragDx: (dx: number) => void;
  setDragDy: (dy: number) => void;

  ensureRafRunning: () => void;
  stopRaf: () => void;
  snapBackDraggedPiece: () => void;
  clearDragRefs: () => void;
};

type UiDeps = {
  setDragPieceId: SetState<PieceId | null>;
  setIsDragging: SetState<boolean>;
  setOverIndexUI: SetState<number | null>;
  setShakePieceId: SetState<PieceId | null>;
} & PreviewUiSetters;

type Args = {
  width: number;
  height: number;
  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  inputLocked: boolean;
  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;

  press: PressStore;
  debug: DebugApi;
  raf: RafApi;
  ui: UiDeps;
};

export function createGridInputController({ width, height, cells, pieces, inputLocked, canSwapAt, onIntent, press, debug, raf, ui }: Args) {
  const MAX_GLOBAL_PRESS_MS = 15_000;

  let globalCleanup: (() => void) | null = null;
  let globalTimeoutId: number | null = null;

  // During a pointer-driven press we handle "click" ourselves via pointerup -> intent.
  // If a legacy/parallel onClick handler still exists in the UI, it can re-dispatch a click
  // using a broken index extraction (classic: e.target.dataset missing => falls back to 0).
  // To prevent "double dispatch" (correct click + wrong click), we swallow the synthetic click
  // that follows a pointerup for this press.
  let clickSwallow: { el: HTMLElement; handler: (e: MouseEvent) => void } | null = null;

  const detachGlobalPointerListeners = () => {
    if (typeof window === 'undefined') return;

    if (globalTimeoutId != null) {
      window.clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
    }

    if (globalCleanup) {
      globalCleanup();
      globalCleanup = null;
    }
  };

  const detachClickSwallowNow = () => {
    if (!clickSwallow) return;
    try {
      clickSwallow.el.removeEventListener('click', clickSwallow.handler, true);
    } catch {
      // ignore
    }
    clickSwallow = null;
  };

  const scheduleDetachClickSwallow = () => {
    // IMPORTANT: click fires after pointerup within the same task.
    // Detach in a later macrotask so we still swallow the immediate click.
    if (typeof window === 'undefined') {
      detachClickSwallowNow();
      return;
    }
    window.setTimeout(() => detachClickSwallowNow(), 0);
  };

  const attachClickSwallow = (el: HTMLElement) => {
    detachClickSwallowNow();

    const handler = (ev: MouseEvent) => {
      // Stop React's delegated onClick (document bubble) + bubble handlers.
      // Do NOT preventDefault so focus behavior remains intact.
      ev.stopImmediatePropagation();
      ev.stopPropagation();
    };

    el.addEventListener('click', handler, { capture: true });
    clickSwallow = { el, handler };
  };

  const clearPressVisuals = () => {
    detachGlobalPointerListeners();

    raf.stopRaf();

    press.set(null);

    raf.clearDragRefs();

    ui.setDragPieceId(null);
    ui.setIsDragging(false);
    ui.setOverIndexUI(null);

    clearPreviewVisuals(ui);

    debug.setInactive();
  };

  const startPress = (pointerId: number, clientX: number, clientY: number, index: number, captureEl: HTMLElement | null) => {
    if (inputLocked) return;

    // Defensive: if a prior press ended without calling finishPress (shouldn't happen),
    // ensure we don't keep swallowing future clicks.
    detachClickSwallowNow();

    const cell = cells[index];
    const pid = cell?.pieceId ?? null;
    const draggable = !!cell && !cell.blocked && pid !== null;

    press.set({
      active: true,
      pointerId,
      fromIndex: index,

      captureEl,

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
    });

    ui.setDragPieceId(draggable ? (pid as PieceId) : null);

    raf.resetForStart();

    ui.setIsDragging(false);
    ui.setOverIndexUI(null);

    clearPreviewVisuals(ui);

    debug.setStart({ pointerId, draggable, fromIndex: index });

    if (captureEl) {
      try {
        captureEl.setPointerCapture(pointerId);
      } catch {
        // ignore
      }

      // Swallow the click that follows pointerup for this press.
      attachClickSwallow(captureEl);
    }

    // Fallback: ensure move/up/cancel are observed even if the UI layer wiring
    // accidentally routes pointer events to a sibling subtree (common source of “no input”).
    attachGlobalPointerListeners(pointerId);
  };

  const updatePress = (pointerId: number, clientX: number, clientY: number) => {
    const p = press.get();
    if (!p || !p.active) return;
    if (p.pointerId !== pointerId) return;

    if (!p.draggable || p.pieceId === null) return;

    const rawDx = clientX - p.startClientX;
    const rawDy = clientY - p.startClientY;

    p.rawDx = rawDx;
    p.rawDy = rawDy;

    const dist = Math.hypot(rawDx, rawDy);

    if (!p.hasExceededThreshold && dist >= DRAG_THRESHOLD) {
      p.hasExceededThreshold = true;
      ui.setIsDragging(true);

      const currentPiece = p.pieceId !== null ? pieces[p.pieceId] : null;
      if (currentPiece) {
        raf.setDragBasePx(cellPixelXY(currentPiece.cellIndex, width));
      }

      raf.ensureRafRunning();
    }

    if (!p.hasExceededThreshold) {
      debug.updateFromPress(p);
      return;
    }

    decideAxisIfNeeded(p);

    if (p.axis === null) {
      p.toIndex = null;
      ui.setOverIndexUI(null);

      if (p.previewLatched) unlatchPreview(p, ui);

      p.smoothedDx = p.smoothedDx + (0 - p.smoothedDx) * SMOOTHING;
      p.smoothedDy = p.smoothedDy + (0 - p.smoothedDy) * SMOOTHING;

      raf.setDragDx(p.smoothedDx);
      raf.setDragDy(p.smoothedDy);

      debug.updateFromPress(p);
      return;
    }

    p.toIndex = computeMagnetTarget({
      fromIndex: p.fromIndex,
      axis: p.axis,
      rawDx: p.rawDx,
      rawDy: p.rawDy,
      width,
      height,
      canSwapAt,
    });

    ui.setOverIndexUI((prev) => (prev === p.toIndex ? prev : p.toIndex));

    const axisDelta = p.axis === 'x' ? p.rawDx : p.rawDy;
    const dir = sign(axisDelta);
    const progress = Math.abs(axisDelta) / tileDist;

    const canPreview = p.toIndex !== null && dir !== 0;

    if (p.previewLatched) {
      const mismatchAxis = p.previewAxis !== p.axis;
      const mismatchTo = p.previewToIndex !== p.toIndex;
      const mismatchDir = p.previewDir !== dir;

      if (!canPreview || mismatchAxis || mismatchTo || mismatchDir) {
        unlatchPreview(p, ui);
      } else if (progress < PREVIEW_RELEASE_RATIO) {
        unlatchPreview(p, ui);
      }
    }

    if (!p.previewLatched) {
      if (canPreview && progress >= PREVIEW_LOCK_RATIO && p.toIndex !== null) {
        latchPreview(p, p.axis, dir, p.toIndex, cells, ui);
      }
    }

    if (p.axis === 'x') {
      const desired = p.previewLatched ? tileDist * (p.previewDir || dir) : clamp(p.rawDx, -tileDist, tileDist);
      p.smoothedDx = p.smoothedDx + (desired - p.smoothedDx) * SMOOTHING;
      p.smoothedDy = p.smoothedDy + (0 - p.smoothedDy) * SMOOTHING;
    } else {
      const desired = p.previewLatched ? tileDist * (p.previewDir || dir) : clamp(p.rawDy, -tileDist, tileDist);
      p.smoothedDy = p.smoothedDy + (desired - p.smoothedDy) * SMOOTHING;
      p.smoothedDx = p.smoothedDx + (0 - p.smoothedDx) * SMOOTHING;
    }

    raf.setDragDx(p.smoothedDx);
    raf.setDragDy(p.smoothedDy);

    debug.updateFromPress(p);
  };

  const finishPress = (pointerId: number, cancelled: boolean) => {
    const p = press.get();
    if (!p || !p.active) return;
    if (p.pointerId !== pointerId) return;

    // Ensure we swallow (then detach) the click that follows this pointerup.
    scheduleDetachClickSwallow();

    if (p.captureEl) {
      try {
        p.captureEl.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }

    const fromIndex = p.fromIndex;
    const draggable = p.draggable;

    if (cancelled || !draggable || !p.hasExceededThreshold) {
      clearPressVisuals();
      if (!cancelled) onIntent({ type: 'click', index: fromIndex });
      return;
    }

    const toIndex = p.previewLatched ? p.previewToIndex : null;

    if (toIndex === null) {
      raf.snapBackDraggedPiece();
      clearPressVisuals();
      return;
    }

    if (!canSwapAt(fromIndex, toIndex)) {
      raf.snapBackDraggedPiece();
      clearPressVisuals();
      if (p.pieceId !== null) ui.setShakePieceId(p.pieceId);
      return;
    }

    clearPressVisuals();
    onIntent({ type: 'swap', from: fromIndex, to: toIndex });
  };

  const attachGlobalPointerListeners = (pointerId: number) => {
    if (typeof window === 'undefined') return;

    // Replace an existing active listeners set (defensive).
    detachGlobalPointerListeners();

    const onMove = (e: PointerEvent) => {
      updatePress(e.pointerId, e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      finishPress(e.pointerId, false);
    };

    const onCancel = (e: PointerEvent) => {
      finishPress(e.pointerId, true);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onCancel, { passive: true });

    globalCleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    globalTimeoutId = window.setTimeout(() => {
      // Best-effort safety: release capture + clear UI if pointerup/cancel was missed.
      finishPress(pointerId, true);
      detachGlobalPointerListeners();
    }, MAX_GLOBAL_PRESS_MS);
  };

  return { startPress, updatePress, finishPress };
}
