// src/features/devtools-host/ui/GameStage.tsx
import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { useHudMaxHeight } from '../../devtools-host/lib/useHudMaxHeight';

type Props = {
  /** Injected ref for grid positioning (devtools panel sync) */
  gridRowRef?: RefObject<HTMLDivElement | null>;
  /** Grid component */
  grid: ReactNode;
  /** HUD component */
  hud: ReactNode;
};

const GRID_CENTER_Y_RATIO = 0.62;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Layout container that positions Grid and HUD within a viewport-relative stage.
 * HUD is constrained to never overlap the grid.
 *
 * PREMIUM: Pixel-snapped grid positioning (no %-based translate centering).
 */
export function GameStage({ gridRowRef: externalGridRowRef, grid, hud }: Props) {
  const internalGridRowRef = useRef<HTMLDivElement | null>(null);
  const gridRowRef = externalGridRowRef ?? internalGridRowRef;

  const stageRef = useRef<HTMLDivElement | null>(null);

  const hudMaxPx = useHudMaxHeight(stageRef, gridRowRef);

  useLayoutEffect(() => {
    const stageEl = stageRef.current;
    const gridEl = gridRowRef.current;
    if (!stageEl || !gridEl) return;

    let rafId: number | null = null;

    const apply = () => {
      rafId = null;

      const s = stageEl.getBoundingClientRect();
      const g = gridEl.getBoundingClientRect();

      // If we can't measure yet, bail.
      if (s.width <= 0 || s.height <= 0 || g.width <= 0 || g.height <= 0) return;

      // Center X, and place grid center at ~62% of stage height (like before),
      // but pixel-snapped and without transforms.
      const rawLeft = (s.width - g.width) * 0.5;
      const rawTop = s.height * GRID_CENTER_Y_RATIO - g.height * 0.5;

      const left = Math.round(rawLeft);
      const top = Math.round(rawTop);

      // Clamp into stage bounds (avoid negative / overflowing placement)
      const maxLeft = Math.max(0, Math.floor(s.width - g.width));
      const maxTop = Math.max(0, Math.floor(s.height - g.height));

      const snappedLeft = clamp(left, 0, maxLeft);
      const snappedTop = clamp(top, 0, maxTop);

      // IMPORTANT: no transform centering (transform introduces subpixel blur easily).
      gridEl.style.left = `${snappedLeft}px`;
      gridEl.style.top = `${snappedTop}px`;
      gridEl.style.transform = 'none';
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(apply);
    };

    // Initial apply (before paint)
    apply();

    // Recompute on size changes (stage / grid)
    const ro = new ResizeObserver(() => schedule());
    ro.observe(stageEl);
    ro.observe(gridEl);

    // Safety net
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [gridRowRef]);

  return (
    <div ref={stageRef} className="relative w-full min-h-[max(520px,calc(100svh-12rem))]">
      {/* GRID: pixel-snapped absolute positioning (no %/translate centering) */}
      <div ref={gridRowRef} className="absolute z-10">
        {grid}
      </div>

      {/* HUD: top-anchored, clipped to not overlap grid */}
      <div className="absolute inset-x-0 top-0 z-20 overflow-y-hidden overflow-x-visible" style={{ maxHeight: hudMaxPx !== null ? `${hudMaxPx}px` : '45%' }}>
        {hud}
      </div>
    </div>
  );
}
