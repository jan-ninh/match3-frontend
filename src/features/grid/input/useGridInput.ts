import { useEffect, useMemo, useRef, useState } from 'react';

import type { EngineState, Piece, PieceId } from '@/gamelogic';

import type { InputIntent, PressState, Axis } from './types';
import type { DebugSnapshot } from '@/devtools';

import { useDevSnapshot } from '../lib/useDevSnapshot';
import { useRafDragTransform } from '../lib/useRafDragTransform';
import { DEBUG_OVERLAY_HZ, EASING, SWAP_MS } from '../lib/constants';
import { cellPixelXY } from '../lib/math';

import { INITIAL_DEBUG_SNAPSHOT, toDebugSnapshot } from './debugSnapshot';
import { beginPress, movePress, endPress, type PressEffect } from './pressHandler';

export type UseGridInputArgs = {
  state: EngineState;
  inputLocked: boolean;
  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;
};

export function useGridInput({ state, inputLocked, canSwapAt, onIntent }: UseGridInputArgs) {
  const { width, height, cells, pieces } = state;

  const pressRef = useRef<PressState | null>(null);

  const { draggedElRef, dragBasePxRef, dragDxRef, dragDyRef, ensureRafRunning, stopRaf, snapBackDraggedPiece, clearDragRefs } = useRafDragTransform({
    swapMs: SWAP_MS,
    easing: EASING,
    getShouldContinue: () => !!(pressRef.current?.active && pressRef.current?.hasExceededThreshold),
  });

  // minimal React state
  const [dragPieceId, setDragPieceId] = useState<PieceId | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [overIndexUI, setOverIndexUI] = useState<number | null>(null);
  const [shakePieceId, setShakePieceId] = useState<PieceId | null>(null);

  const [previewActive, setPreviewActive] = useState(false);
  const [previewOtherPieceId, setPreviewOtherPieceId] = useState<PieceId | null>(null);
  const [previewAxisUI, setPreviewAxisUI] = useState<Axis | null>(null);
  const [previewDirUI, setPreviewDirUI] = useState<-1 | 0 | 1>(0);

  const { isDev, snapshotRef: debugSnapshotRef, snapshot: debugSnapshot } = useDevSnapshot<DebugSnapshot>(INITIAL_DEBUG_SNAPSHOT, DEBUG_OVERLAY_HZ);

  const pieceList = useMemo(() => Object.values(pieces) as Piece[], [pieces]);

  const applyEffects = (effects: PressEffect[]) => {
    for (const e of effects) {
      switch (e.type) {
        case 'setDragPieceId':
          setDragPieceId(e.value);
          break;

        case 'setIsDragging':
          setIsDragging(e.value);
          break;

        case 'setOverIndexUI':
          setOverIndexUI((prev) => (prev === e.value ? prev : e.value));
          break;

        case 'setShakePieceId':
          setShakePieceId(e.value);
          break;

        case 'setPreview':
          setPreviewActive(e.active);
          setPreviewOtherPieceId(e.otherPieceId);
          setPreviewAxisUI(e.axis);
          setPreviewDirUI(e.dir);
          break;

        case 'setDragDelta':
          dragDxRef.current = e.dx;
          dragDyRef.current = e.dy;
          break;

        case 'setDragBaseFromPiece': {
          dragBasePxRef.current = cellPixelXY(e.cellIndex, width);
          break;
        }

        case 'ensureRafRunning':
          ensureRafRunning();
          break;

        case 'stopRaf':
          stopRaf();
          break;

        case 'snapBackDraggedPiece':
          snapBackDraggedPiece();
          break;

        case 'clearDragRefs':
          clearDragRefs();
          draggedElRef.current = null;
          break;

        case 'intent':
          onIntent(e.intent);
          break;

        default: {
          const _exhaustive: never = e;
          void _exhaustive;
        }
      }
    }

    if (isDev) {
      debugSnapshotRef.current = toDebugSnapshot(pressRef.current);
    }
  };

  const onCellPointerDown = (index: number, ev: React.PointerEvent<HTMLButtonElement>) => {
    if (ev.button !== 0) return;

    const { press, effects } = beginPress({
      inputLocked,
      pointerId: ev.pointerId,
      clientX: ev.clientX,
      clientY: ev.clientY,
      index,
      cell: cells[index],
    });

    // store capture element in pressRef for release symmetry
    if (press) {
      press.captureEl = ev.currentTarget;
      pressRef.current = press;

      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    } else {
      pressRef.current = null;
    }

    // reset rAF refs like before
    dragDxRef.current = 0;
    dragDyRef.current = 0;
    dragBasePxRef.current = null;
    draggedElRef.current = null;

    applyEffects(effects);
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const res = movePress(
      pressRef.current,
      {
        width,
        height,
        canSwapAt,
        getPieceById: (id) => pieces[id] ?? null,
        getCellPieceId: (i) => cells[i]?.pieceId ?? null,
      },
      { pointerId: ev.pointerId, clientX: ev.clientX, clientY: ev.clientY },
    );

    pressRef.current = res.press;
    applyEffects(res.effects);
  };

  const finish = (pointerId: number, cancelled: boolean) => {
    const p = pressRef.current;
    if (p?.captureEl) {
      try {
        p.captureEl.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }

    const res = endPress(pressRef.current, { canSwapAt }, { pointerId, cancelled });
    pressRef.current = res.press;
    applyEffects(res.effects);
  };

  const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => finish(ev.pointerId, false);
  const onPointerCancel = (ev: React.PointerEvent<HTMLDivElement>) => finish(ev.pointerId, true);

  const setDraggedEl = (el: HTMLDivElement | null, basePos: { x: number; y: number }) => {
    draggedElRef.current = el;
    if (el && isDragging && dragBasePxRef.current === null) {
      dragBasePxRef.current = basePos;
      ensureRafRunning();
    }
  };

  useEffect(() => {
    if (shakePieceId === null) return;
    const t = window.setTimeout(() => setShakePieceId(null), 220);
    return () => window.clearTimeout(t);
  }, [shakePieceId]);

  useEffect(() => {
    return () => stopRaf();
  }, [stopRaf]);

  // keep debug snapshot fresh even when there are no effects (optional safety)
  useEffect(() => {
    if (!isDev) return;
    debugSnapshotRef.current = toDebugSnapshot(pressRef.current);
  }, [isDev, debugSnapshotRef]);

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
