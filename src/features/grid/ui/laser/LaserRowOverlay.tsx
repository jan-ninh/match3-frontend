// src/features/grid/ui/laser/LaserRowOverlay.tsx
import type { CSSProperties } from 'react';

export type LaserRowOverlayProps = Readonly<{
  armed: boolean;
  row: number | null;
  height: number;
  zIndex?: number;
}>;

export function LaserRowOverlay({ armed, row, height, zIndex = 0 }: LaserRowOverlayProps) {
  if (!armed) return null;

  const rowH = height > 0 ? 100 / height : 0;
  const top = row != null && height > 0 ? (row / height) * 100 : null;

  const rootStyle: CSSProperties = { zIndex };

  const rowStyle: CSSProperties =
    top == null
      ? {}
      : {
          top: `${top}%`,
          height: `${rowH}%`,
        };

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={rootStyle}>
      {/* Mode hint: subtle board tint */}
      <div className="absolute inset-0 bg-rose-500/5" />

      {/* Keep the pulsing outline ALWAYS visible while armed (even when hovering a row). */}
      <div className="absolute inset-0 rounded-md border-2 border-rose-400/30 animate-pulse" />

      {/* If we have a hovered row, highlight it on top of the outline. */}
      {top == null ? null : <div className="absolute left-0 right-0 bg-rose-500/20 border-y border-rose-400/40" style={rowStyle} />}
    </div>
  );
}
