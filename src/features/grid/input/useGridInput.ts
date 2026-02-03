import { useEffect, useMemo, useRef, useState } from "react";

import type { EngineState, Piece, PieceId } from "@/gamelogic";
import { xyOf } from "@/gamelogic";

import type { Axis, InputIntent, PressState } from "./types";
import type { DebugSnapshot } from "@/devtools";
import { useDevSnapshot } from "../lib/useDevSnapshot";
import { useRafDragTransform } from "../lib/useRafDragTransform";

import {
  DEBUG_OVERLAY_HZ,
  DRAG_THRESHOLD,
  EASING,
  LOCK_DOMINANCE,
  LOCK_THRESHOLD,
  PREVIEW_LOCK_RATIO,
  PREVIEW_RELEASE_RATIO,
  RELOCK_DOMINANCE,
  SMOOTHING,
  SWAP_MS,
  tileDist,
} from "../lib/constants";
import { cellPixelXY, clamp, sign } from "../lib/math";
export type UseGridInputArgs = {
  state: EngineState;
  inputLocked: boolean;
  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;
};

export function useGridInput({ state, inputLocked, canSwapAt, onIntent }: UseGridInputArgs) {
  const { width, height, cells, pieces } = state;

  const pressRef = useRef<PressState | null>(null);

  // rAF transform infra (no React re-render per pointer move)
  const { draggedElRef, dragBasePxRef, dragDxRef, dragDyRef, ensureRafRunning, stopRaf, snapBackDraggedPiece, clearDragRefs } = useRafDragTransform({
    swapMs: SWAP_MS,
    easing: EASING,
    getShouldContinue: () => !!(pressRef.current?.active && pressRef.current?.hasExceededThreshold),
  });

  // minimal React state (rare changes only)
  const [dragPieceId, setDragPieceId] = useState<PieceId | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // UI highlights / feedback
  const [overIndexUI, setOverIndexUI] = useState<number | null>(null);
  const [shakePieceId, setShakePieceId] = useState<PieceId | null>(null);

  // preview other-piece displacement (changes rarely: latch/unlatch only)
  const [previewActive, setPreviewActive] = useState(false);
  const [previewOtherPieceId, setPreviewOtherPieceId] = useState<PieceId | null>(null);
  const [previewAxisUI, setPreviewAxisUI] = useState<Axis | null>(null);
  const [previewDirUI, setPreviewDirUI] = useState<-1 | 0 | 1>(0);

  // dev snapshot (throttled)
  const initialDebugSnapshot: DebugSnapshot = {
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

  const { isDev, snapshotRef: debugSnapshotRef, snapshot: debugSnapshot } = useDevSnapshot<DebugSnapshot>(initialDebugSnapshot, DEBUG_OVERLAY_HZ);

  const pieceList = useMemo(() => Object.values(pieces) as Piece[], [pieces]);

  const clearPreviewVisuals = () => {
    setPreviewActive(false);
    setPreviewOtherPieceId(null);
    setPreviewAxisUI(null);
    setPreviewDirUI(0);
  };

  const clearPressVisuals = () => {
    stopRaf();

    pressRef.current = null;

    clearDragRefs();

    setDragPieceId(null);
    setIsDragging(false);
    setOverIndexUI(null);

    clearPreviewVisuals();

    if (isDev) {
      debugSnapshotRef.current = {
        ...debugSnapshotRef.current,
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
  };

  const updateDebugSnapshot = (p: PressState) => {
    if (!isDev) return;

    debugSnapshotRef.current = {
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
  };

  const startPress = (pointerId: number, clientX: number, clientY: number, index: number, captureEl: HTMLElement | null) => {
    if (inputLocked) return;

    const cell = cells[index];
    const pid = cell?.pieceId ?? null;
    const draggable = !!cell && !cell.blocked && pid !== null;

    pressRef.current = {
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
    };

    setDragPieceId(draggable ? (pid as PieceId) : null);

    dragDxRef.current = 0;
    dragDyRef.current = 0;
    dragBasePxRef.current = null;

    draggedElRef.current = null;

    setIsDragging(false);
    setOverIndexUI(null);
    clearPreviewVisuals();

    if (isDev) {
      debugSnapshotRef.current = {
        active: true,
        pointerId,
        draggable,
        fromIndex: index,
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

    // Robust capture: capture on the element that received pointerdown.
    if (captureEl) {
      try {
        captureEl.setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
  };

  const decideAxisIfNeeded = (p: PressState): void => {
    const ax = Math.abs(p.rawDx);
    const ay = Math.abs(p.rawDy);

    if (Math.max(ax, ay) < LOCK_THRESHOLD) return;

    if (p.axis === null) {
      if (ax >= ay * LOCK_DOMINANCE) {
        p.axis = "x";
      } else if (ay >= ax * LOCK_DOMINANCE) {
        p.axis = "y";
      }
      return;
    }

    if (p.axis === "x") {
      if (ay >= ax * RELOCK_DOMINANCE) p.axis = "y";
    } else {
      if (ax >= ay * RELOCK_DOMINANCE) p.axis = "x";
    }
  };

  const computeMagnetTarget = (fromIndex: number, axis: Axis, rawDx: number, rawDy: number): number | null => {
    const dir = axis === "x" ? sign(rawDx) : sign(rawDy);
    if (dir === 0) return null;

    const offset = axis === "x" ? dir : dir * width;
    const to = fromIndex + offset;

    if (to < 0 || to >= width * height) return null;

    if (axis === "x") {
      const { x: fx } = xyOf(fromIndex, width);
      const { x: tx } = xyOf(to, width);
      if (Math.abs(tx - fx) !== 1) return null;
    }

    if (!canSwapAt(fromIndex, to)) return null;

    return to;
  };

  const latchPreview = (p: PressState, axis: Axis, dir: -1 | 0 | 1, toIndex: number) => {
    if (dir === 0) return;

    const otherPid = cells[toIndex]?.pieceId ?? null;
    if (otherPid === null) return;

    p.previewLatched = true;
    p.previewAxis = axis;
    p.previewDir = dir;
    p.previewToIndex = toIndex;

    setPreviewActive(true);
    setPreviewOtherPieceId(otherPid as PieceId);
    setPreviewAxisUI(axis);
    setPreviewDirUI(dir);
  };

  const unlatchPreview = (p: PressState) => {
    p.previewLatched = false;
    p.previewAxis = null;
    p.previewDir = 0;
    p.previewToIndex = null;

    clearPreviewVisuals();
  };

  const updatePress = (pointerId: number, clientX: number, clientY: number) => {
    const p = pressRef.current;
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
      setIsDragging(true);

      const currentPiece = p.pieceId !== null ? pieces[p.pieceId] : null;
      if (currentPiece) {
        dragBasePxRef.current = cellPixelXY(currentPiece.cellIndex, width);
      }

      ensureRafRunning();
    }

    if (!p.hasExceededThreshold) {
      updateDebugSnapshot(p);
      return;
    }

    decideAxisIfNeeded(p);

    if (p.axis === null) {
      p.toIndex = null;
      setOverIndexUI(null);

      if (p.previewLatched) unlatchPreview(p);

      p.smoothedDx = p.smoothedDx + (0 - p.smoothedDx) * SMOOTHING;
      p.smoothedDy = p.smoothedDy + (0 - p.smoothedDy) * SMOOTHING;

      dragDxRef.current = p.smoothedDx;
      dragDyRef.current = p.smoothedDy;

      updateDebugSnapshot(p);
      return;
    }

    p.toIndex = computeMagnetTarget(p.fromIndex, p.axis, p.rawDx, p.rawDy);
    setOverIndexUI((prev) => (prev === p.toIndex ? prev : p.toIndex));

    const axisDelta = p.axis === "x" ? p.rawDx : p.rawDy;
    const dir = sign(axisDelta);
    const progress = Math.abs(axisDelta) / tileDist;

    const canPreview = p.toIndex !== null && dir !== 0;

    if (p.previewLatched) {
      const mismatchAxis = p.previewAxis !== p.axis;
      const mismatchTo = p.previewToIndex !== p.toIndex;
      const mismatchDir = p.previewDir !== dir;

      if (!canPreview || mismatchAxis || mismatchTo || mismatchDir) {
        unlatchPreview(p);
      } else if (progress < PREVIEW_RELEASE_RATIO) {
        unlatchPreview(p);
      }
    }

    if (!p.previewLatched) {
      if (canPreview && progress >= PREVIEW_LOCK_RATIO && p.toIndex !== null) {
        latchPreview(p, p.axis, dir, p.toIndex);
      }
    }

    if (p.axis === "x") {
      const desired = p.previewLatched ? tileDist * (p.previewDir || dir) : clamp(p.rawDx, -tileDist, tileDist);
      p.smoothedDx = p.smoothedDx + (desired - p.smoothedDx) * SMOOTHING;
      p.smoothedDy = p.smoothedDy + (0 - p.smoothedDy) * SMOOTHING;
    } else {
      const desired = p.previewLatched ? tileDist * (p.previewDir || dir) : clamp(p.rawDy, -tileDist, tileDist);
      p.smoothedDy = p.smoothedDy + (desired - p.smoothedDy) * SMOOTHING;
      p.smoothedDx = p.smoothedDx + (0 - p.smoothedDx) * SMOOTHING;
    }

    dragDxRef.current = p.smoothedDx;
    dragDyRef.current = p.smoothedDy;

    updateDebugSnapshot(p);
  };

  const finishPress = (pointerId: number, cancelled: boolean) => {
    const p = pressRef.current;
    if (!p || !p.active) return;
    if (p.pointerId !== pointerId) return;

    // Release capture from the element that captured it.
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
      if (!cancelled) onIntent({ type: "click", index: fromIndex });
      return;
    }

    const toIndex = p.previewLatched ? p.previewToIndex : null;

    if (toIndex === null) {
      snapBackDraggedPiece();
      clearPressVisuals();
      return;
    }

    if (!canSwapAt(fromIndex, toIndex)) {
      snapBackDraggedPiece();
      clearPressVisuals();
      if (p.pieceId !== null) setShakePieceId(p.pieceId);
      return;
    }

    clearPressVisuals();
    onIntent({ type: "swap", from: fromIndex, to: toIndex });
  };

  useEffect(() => {
    if (shakePieceId === null) return;
    const t = window.setTimeout(() => setShakePieceId(null), 220);
    return () => window.clearTimeout(t);
  }, [shakePieceId]);

  useEffect(() => {
    return () => stopRaf();
  }, [stopRaf]);

  const onCellPointerDown = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    startPress(e.pointerId, e.clientX, e.clientY, index, e.currentTarget);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => updatePress(e.pointerId, e.clientX, e.clientY);
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => finishPress(e.pointerId, false);
  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => finishPress(e.pointerId, true);

  const setDraggedEl = (el: HTMLDivElement | null, basePos: { x: number; y: number }) => {
    draggedElRef.current = el;

    if (el && isDragging && dragBasePxRef.current === null) {
      dragBasePxRef.current = basePos;
      ensureRafRunning();
    }
  };

  return {
    isDev,
    debugSnapshot,

    pieceList,

    dragPieceId,
    isDragging,
    overIndexUI,
    shakePieceId,

    previewActive,
    previewOtherPieceId,
    previewAxisUI,
    previewDirUI,

    onCellPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,

    setDraggedEl,
  };
}
