// src/features/grid/lib/useRafDragTransform.ts
import { useCallback, useEffect, useRef } from 'react';

type Args = {
  swapMs: number;
  easing: string;
  getShouldContinue: () => boolean;
};

export function useRafDragTransform({ swapMs, easing, getShouldContinue }: Args) {
  const draggedElRef = useRef<HTMLDivElement | null>(null);

  const dragDxRef = useRef(0);
  const dragDyRef = useRef(0);
  const dragBasePxRef = useRef<{ x: number; y: number } | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const rafRunningRef = useRef(false);

  // holds the latest loop function
  const loopRef = useRef<(() => void) | null>(null);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    rafRunningRef.current = false;
  }, []);

  const applyDraggedTransform = useCallback(() => {
    rafIdRef.current = null;

    const el = draggedElRef.current;
    const base = dragBasePxRef.current;

    if (!el || !base) {
      rafRunningRef.current = false;
      return;
    }

    const dx = dragDxRef.current;
    const dy = dragDyRef.current;

    // PREMIUM: snap to whole pixels during drag to avoid blur from subpixel transforms
    const tx = Math.round(base.x + dx);
    const ty = Math.round(base.y + dy);

    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;

    if (getShouldContinue()) {
      rafIdRef.current = window.requestAnimationFrame(() => loopRef.current?.());
    } else {
      rafRunningRef.current = false;
    }
  }, [getShouldContinue]);

  // keep ref pointing to latest callback
  useEffect(() => {
    loopRef.current = applyDraggedTransform;
  }, [applyDraggedTransform]);

  const ensureRafRunning = useCallback(() => {
    if (rafRunningRef.current) return;

    rafRunningRef.current = true;

    const loop = loopRef.current ?? applyDraggedTransform;
    rafIdRef.current = window.requestAnimationFrame(() => loop());
  }, [applyDraggedTransform]);

  const snapBackDraggedPiece = useCallback(() => {
    const el = draggedElRef.current;
    const base = dragBasePxRef.current;
    if (!el || !base) return;

    const tx = Math.round(base.x);
    const ty = Math.round(base.y);

    el.style.transition = `transform ${swapMs}ms ${easing}`;
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  }, [swapMs, easing]);

  // IMPORTANT: rAF directly mutates el.style.transform.
  // React may *not* overwrite that transform on release if its render-time `style.transform`
  // value stayed the same (common for the dragged piece: basePos doesn't change).
  // So we need an explicit "hard reset" for cancel/leave/lock edge cases.
  const resetDraggedPieceInstant = useCallback(() => {
    const el = draggedElRef.current;
    const base = dragBasePxRef.current;
    if (!el || !base) return;

    const tx = Math.round(base.x);
    const ty = Math.round(base.y);

    // cancel any prior snap-back transition and force the base transform now
    el.style.transition = '';
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  }, []);

  const clearDragRefs = useCallback(() => {
    stopRaf();

    dragDxRef.current = 0;
    dragDyRef.current = 0;
    dragBasePxRef.current = null;

    draggedElRef.current = null;
  }, [stopRaf]);

  return {
    draggedElRef,
    dragDxRef,
    dragDyRef,
    dragBasePxRef,
    ensureRafRunning,
    stopRaf,
    snapBackDraggedPiece,
    resetDraggedPieceInstant,
    clearDragRefs,
  };
}
