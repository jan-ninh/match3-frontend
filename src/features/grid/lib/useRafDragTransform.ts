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

    el.style.transform = `translate(${base.x + dx}px, ${base.y + dy}px)`;

    if (getShouldContinue()) {
      // call the latest loop function (no self-reference issue)
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

    el.style.transition = `transform ${swapMs}ms ${easing}`;
    el.style.transform = `translate(${base.x}px, ${base.y}px)`;
  }, [swapMs, easing]);

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
    clearDragRefs,
  };
}
