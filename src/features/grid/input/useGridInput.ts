// src/features/grid/input/useGridInput.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EngineState, Piece, PieceId } from '@/gamelogic';

import type { InputIntent, PressState } from './typesInput';
import type { DebugSnapshot } from '@/devtools';
import { useDevSnapshot } from '../lib/useDevSnapshot';
import { useRafDragTransform } from '../lib/useRafDragTransform';

import { createGridInputController } from './useGridInput.controller';
import { makeInitialDebugSnapshot, setDebugInactive, setDebugStart, updateDebugFromPress } from './useGridInput.debug';
import { DEBUG_OVERLAY_HZ, EASING, SWAP_MS } from '../lib/constants';

export type UseGridInputArgs = {
  state: EngineState;
  inputLocked: boolean;
  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;

  // NEW: runtime debug toggle (Dev panels + all debug work)
  debugEnabled: boolean;

  // animation timing (runtime)
  swapMs?: number;
};

export function useGridInput({ state, inputLocked, canSwapAt, onIntent, debugEnabled, swapMs = SWAP_MS }: UseGridInputArgs) {
  const { width, height, cells, pieces } = state;

  const pressRef = useRef<PressState | null>(null);

  // Tracks the active pointer sequence for robust release handling.
  // Needed because some UI layers (targeting, overlays, pointer-capture edge cases) can prevent the normal
  // onPointerUp/onPointerCancel path from reaching the controller -> stuck "pressed/dragging".
  const [activePointerId, setActivePointerId] = useState<number | null>(null);

  // Synchronous, capture-phase release fallback (fixes "quick click" race + stopPropagation cases).
  const releaseCleanupRef = useRef<(() => void) | null>(null);

  // rAF transform infra (no React re-render per pointer move)
  const { draggedElRef, dragBasePxRef, dragDxRef, dragDyRef, ensureRafRunning, stopRaf, snapBackDraggedPiece, clearDragRefs } = useRafDragTransform({
    swapMs,
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
  const [previewAxisUI, setPreviewAxisUI] = useState<'x' | 'y' | null>(null);
  const [previewDirUI, setPreviewDirUI] = useState<-1 | 0 | 1>(0);

  // dev snapshot (throttled)
  const initialDebugSnapshot: DebugSnapshot = useMemo(() => makeInitialDebugSnapshot(), []);

  // NEW: pass debugEnabled down, so interval doesn't exist when debug is off
  const { isDev, snapshotRef: debugSnapshotRef, snapshot: debugSnapshot } = useDevSnapshot<DebugSnapshot>(initialDebugSnapshot, DEBUG_OVERLAY_HZ, debugEnabled);

  const canDebug = isDev && debugEnabled;

  const pieceList = useMemo(() => Object.values(pieces) as Piece[], [pieces]);

  const press = useMemo(
    () => ({
      get: () => pressRef.current,
      set: (v: PressState | null) => {
        pressRef.current = v;
      },
    }),
    [],
  );

  const debug = useMemo(
    () => ({
      setInactive: () => setDebugInactive(debugSnapshotRef, canDebug),
      setStart: (args: { pointerId: number; draggable: boolean; fromIndex: number }) => setDebugStart(debugSnapshotRef, canDebug, args),
      updateFromPress: (p: PressState) => updateDebugFromPress(debugSnapshotRef, canDebug, p),
    }),
    [debugSnapshotRef, canDebug],
  );

  const raf = useMemo(
    () => ({
      resetForStart: () => {
        dragDxRef.current = 0;
        dragDyRef.current = 0;
        dragBasePxRef.current = null;
        draggedElRef.current = null;
      },
      setDragBasePx: (pos: { x: number; y: number } | null) => {
        dragBasePxRef.current = pos;
      },
      setDragDx: (dx: number) => {
        dragDxRef.current = dx;
      },
      setDragDy: (dy: number) => {
        dragDyRef.current = dy;
      },
      ensureRafRunning,
      stopRaf,
      snapBackDraggedPiece,
      clearDragRefs,
    }),
    [ensureRafRunning, stopRaf, snapBackDraggedPiece, clearDragRefs, dragDxRef, dragDyRef, dragBasePxRef, draggedElRef],
  );

  const controllerRef = useRef<ReturnType<typeof createGridInputController> | null>(null);

  const buildController = useCallback(() => {
    return createGridInputController({
      width,
      height,
      cells,
      pieces: pieces as Record<PieceId, Piece>,
      inputLocked,
      canSwapAt,
      onIntent,
      press,
      debug,
      raf,
      ui: {
        setDragPieceId,
        setIsDragging,
        setOverIndexUI,
        setShakePieceId,

        setPreviewActive,
        setPreviewOtherPieceId,
        setPreviewAxisUI,
        setPreviewDirUI,
      },
    });
  }, [
    width,
    height,
    cells,
    pieces,
    inputLocked,
    canSwapAt,
    onIntent,
    press,
    debug,
    raf,
    setDragPieceId,
    setIsDragging,
    setOverIndexUI,
    setShakePieceId,
    setPreviewActive,
    setPreviewOtherPieceId,
    setPreviewAxisUI,
    setPreviewDirUI,
  ]);

  // IMPORTANT: build controller outside render to satisfy react-hooks/refs
  useEffect(() => {
    controllerRef.current = buildController();
  }, [buildController]);

  const ensureController = useCallback(() => {
    const c = controllerRef.current ?? buildController();
    controllerRef.current = c;
    return c;
  }, [buildController]);

  const clearGlobalRelease = useCallback(() => {
    const cleanup = releaseCleanupRef.current;
    if (cleanup) cleanup();
    releaseCleanupRef.current = null;
  }, []);

  const installGlobalRelease = useCallback(
    (pointerId: number) => {
      if (typeof window === 'undefined') return;

      clearGlobalRelease();

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        ensureController().finishPress(pointerId, false);
        setActivePointerId((cur) => (cur === pointerId ? null : cur));
        clearGlobalRelease();
      };

      const onCancel = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        ensureController().finishPress(pointerId, true);
        setActivePointerId((cur) => (cur === pointerId ? null : cur));
        clearGlobalRelease();
      };

      const onBlur = () => {
        ensureController().finishPress(pointerId, true);
        setActivePointerId((cur) => (cur === pointerId ? null : cur));
        clearGlobalRelease();
      };

      // capture=true => we see events even if some layer stops propagation
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onCancel, true);
      window.addEventListener('blur', onBlur);

      releaseCleanupRef.current = () => {
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onCancel, true);
        window.removeEventListener('blur', onBlur);
      };
    },
    [ensureController, clearGlobalRelease],
  );

  // If the engine locks mid-gesture, cancel the active pointer sequence to avoid stuck visuals/state.
  useEffect(() => {
    if (!inputLocked) return;
    if (activePointerId === null) return;
    ensureController().finishPress(activePointerId, true);
    setActivePointerId(null);
    clearGlobalRelease();
  }, [inputLocked, activePointerId, ensureController, clearGlobalRelease]);

  useEffect(() => {
    if (shakePieceId === null) return;
    const t = window.setTimeout(() => setShakePieceId(null), 220);
    return () => window.clearTimeout(t);
  }, [shakePieceId]);

  useEffect(() => {
    return () => {
      clearGlobalRelease();
      stopRaf();
    };
  }, [stopRaf, clearGlobalRelease]);

  const onCellPointerDown = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;

    ensureController().startPress(e.pointerId, e.clientX, e.clientY, index, e.currentTarget);

    // Only mark active if the press actually started (startPress no-ops when locked).
    if (pressRef.current?.active && pressRef.current.pointerId === e.pointerId) {
      setActivePointerId(e.pointerId);
      installGlobalRelease(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => ensureController().updatePress(e.pointerId, e.clientX, e.clientY);

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    ensureController().finishPress(e.pointerId, false);
    if (activePointerId === e.pointerId) setActivePointerId(null);
    clearGlobalRelease();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    ensureController().finishPress(e.pointerId, true);
    if (activePointerId === e.pointerId) setActivePointerId(null);
    clearGlobalRelease();
  };

  // NEW: shell leave should never be able to crash the game. It just clears UI feedback.
  const onShellPointerLeave = () => {
    setOverIndexUI(null);
    setPreviewActive(false);
    setPreviewOtherPieceId(null);
    setPreviewAxisUI(null);
    setPreviewDirUI(0);

    setIsDragging(false);
    setDragPieceId(null);

    pressRef.current = null;
    setActivePointerId(null);

    setDebugInactive(debugSnapshotRef, canDebug);

    clearGlobalRelease();
    stopRaf();
    clearDragRefs();
  };

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
    onShellPointerLeave,

    setDraggedEl,
  };
}
