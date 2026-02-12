// src/features/devtools-host/lib/useHudMaxHeight.ts
import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

const HUD_GRID_GAP_PX = 12;

/**
 * Computes the maximum HUD height so it never overlaps the grid.
 * Returns null until geometry is measured.
 */
export function useHudMaxHeight(stageRef: RefObject<HTMLDivElement | null>, gridRef: RefObject<HTMLDivElement | null>): number | null {
  const [hudMaxPx, setHudMaxPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const stageEl = stageRef.current;
    const gridEl = gridRef.current;
    if (!stageEl || !gridEl) return;

    let raf = 0;

    const recalc = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const s = stageEl.getBoundingClientRect();
        const g = gridEl.getBoundingClientRect();
        const next = Math.max(0, Math.round(g.top - s.top - HUD_GRID_GAP_PX));
        setHudMaxPx((prev) => (prev === next ? prev : next));
      });
    };

    recalc();

    const onResize = () => recalc();
    window.addEventListener('resize', onResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => recalc());
      ro.observe(stageEl);
      ro.observe(gridEl);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [stageRef, gridRef]);

  return hudMaxPx;
}
