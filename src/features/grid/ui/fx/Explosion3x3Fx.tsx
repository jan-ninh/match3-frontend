// src/features/grid/ui/fx/Explosion3x3Fx.tsx
import type { CSSProperties } from 'react';
import { FlipbookSprite } from './FlipbookSprite';

export type GridCoord = {
  x: number; // 0..W-1
  y: number; // 0..H-1
};

export type PxPoint = {
  x: number;
  y: number;
};

export type Explosion3x3FxProps = {
  /**
   * Center cell of the 3×3 area (bomb center).
   * The effect will be centered at (center.x + 0.5, center.y + 0.5) in grid cell space.
   */
  center: GridCoord;

  /**
   * Pixel size of ONE grid cell (tile).
   * Example: 64
   */
  cellPx: number;

  /**
   * Optional offset if your overlay layer isn't exactly at grid (0,0).
   * Usually you can leave this at {0,0} when rendering inside the grid wrapper.
   */
  gridOriginPx?: PxPoint;

  /**
   * URL of the flipbook sheet (imported via Vite).
   * Example:
   *   import explosionSheetUrl from '@/assets/fx/explosion_flipbook_5x6_256.png';
   */
  sheetUrl: string;

  /**
   * Render size in "cells". Default: 3 (covers the 3×3 area).
   * You can set 3.5 or 4 for a "bigger boom".
   */
  sizeCells?: number;

  /**
   * Playback controls.
   */
  fps?: number; // default 30
  paused?: boolean;
  onDone?: () => void;

  /**
   * Visual tuning.
   * Note: Our generated sheet has no true alpha background; these help it blend.
   */
  opacity?: number; // default 1
  mixBlendMode?: CSSProperties['mixBlendMode']; // e.g. 'screen' | 'lighter'
  filter?: string; // e.g. 'drop-shadow(0 0 12px rgba(255,80,0,0.35))'

  className?: string;
  style?: CSSProperties;
};

const DEFAULT_SHEET_SPEC = {
  cols: 5,
  rows: 6,
  frameW: 256,
  frameH: 256,
  frameCount: 30,
} as const;

/**
 * Explosion3x3Fx
 * - Position: absolute
 * - Anchor: centered over 3×3 target area
 *
 * IMPORTANT:
 * - Parent container must be `position: relative` and share the same pixel space as your grid.
 * - Render this in your grid overlay layer.
 */
export function Explosion3x3Fx({
  center,
  cellPx,
  gridOriginPx = { x: 0, y: 0 },
  sheetUrl,
  sizeCells = 3,

  fps = 30,
  paused,
  onDone,

  opacity = 1,
  mixBlendMode = 'screen',
  filter = 'drop-shadow(0 0 10px rgba(255, 80, 0, 0.28))',

  className,
  style,
}: Explosion3x3FxProps) {
  const safeCellPx = Number.isFinite(cellPx) && cellPx > 0 ? cellPx : 1;
  const safeSizeCells = Number.isFinite(sizeCells) && sizeCells > 0 ? sizeCells : 3;

  // Center of the 3×3 area in pixels
  const cx = gridOriginPx.x + (center.x + 0.5) * safeCellPx;
  const cy = gridOriginPx.y + (center.y + 0.5) * safeCellPx;

  // Render size (in px) – default: 3 cells × 3 cells
  const renderW = safeSizeCells * safeCellPx;
  const renderH = safeSizeCells * safeCellPx;

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: cx,
    top: cy,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    ...style,
  };

  return (
    <div className={className} style={wrapperStyle}>
      <FlipbookSprite
        sheet={{
          sheetUrl,
          cols: DEFAULT_SHEET_SPEC.cols,
          rows: DEFAULT_SHEET_SPEC.rows,
          frameW: DEFAULT_SHEET_SPEC.frameW,
          frameH: DEFAULT_SHEET_SPEC.frameH,
          frameCount: DEFAULT_SHEET_SPEC.frameCount,
        }}
        fps={fps}
        paused={paused}
        loop={false}
        renderW={renderW}
        renderH={renderH}
        opacity={opacity}
        mixBlendMode={mixBlendMode}
        filter={filter}
        onDone={onDone}
        ariaLabel="explosion"
      />
    </div>
  );
}
