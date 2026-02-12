// src/features/devtools-host/ui/GameStage.tsx
import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';

import { useHudMaxHeight } from '../../grid/lib/useHudMaxHeight';

type Props = {
  /** Injected ref for grid positioning (devtools panel sync) */
  gridRowRef?: RefObject<HTMLDivElement | null>;
  /** Grid component */
  grid: ReactNode;
  /** HUD component */
  hud: ReactNode;
};

/**
 * Layout container that positions Grid and HUD within a viewport-relative stage.
 * HUD is constrained to never overlap the grid.
 */
export function GameStage({ gridRowRef: externalGridRowRef, grid, hud }: Props) {
  const internalGridRowRef = useRef<HTMLDivElement | null>(null);
  const gridRowRef = externalGridRowRef ?? internalGridRowRef;

  const stageRef = useRef<HTMLDivElement | null>(null);

  const hudMaxPx = useHudMaxHeight(stageRef, gridRowRef);

  return (
    <div ref={stageRef} className="relative w-full min-h-[max(520px,calc(100svh-12rem))]">
      {/* GRID: centered, offset slightly below center */}
      <div ref={gridRowRef} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 top-[62%]">
        {grid}
      </div>

      {/* HUD: top-anchored, clipped to not overlap grid */}
      <div className="absolute inset-x-0 top-0 z-20 overflow-y-hidden overflow-x-visible" style={{ maxHeight: hudMaxPx !== null ? `${hudMaxPx}px` : '45%' }}>
        {hud}
      </div>
    </div>
  );
}
