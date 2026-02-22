import { useMemo } from 'react';

import type { PossibleMatchSwap } from '@/gamelogic/match';
import { cellPixelXY } from '../../lib/math';

type Props = {
  swaps: readonly PossibleMatchSwap[];
  width: number;
  height: number;
  zIndex?: number;
};

type Pitch = Readonly<{ w: number; h: number }>;

function inferPitch(width: number, height: number): Pitch {
  // Heuristic: derive the cell pitch from the coordinate mapping used elsewhere (selection/target overlays).
  const p00 = cellPixelXY(0, width);

  const p10 = width > 1 ? cellPixelXY(1, width) : p00;
  const p01 = height > 1 ? cellPixelXY(width, width) : p00;

  const dx = Math.max(1, Math.abs((p10?.x ?? 0) - (p00?.x ?? 0)));
  const dy = Math.max(1, Math.abs((p01?.y ?? 0) - (p00?.y ?? 0)));

  // Most boards are square cells; still keep both for safety.
  return { w: dx, h: dy };
}

function hueForGroup(i: number): number {
  // Prime-ish step => spreads colors even for many swaps.
  return (i * 67) % 360;
}

function hsla(hue: number, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return `hsla(${hue}, 95%, 62%, ${a})`;
}

type CellPos = Readonly<{ x: number; y: number }>;

function cellTopLeft(index: number, width: number): CellPos {
  const p = cellPixelXY(index, width);
  return { x: p.x, y: p.y };
}

export default function MatchHintsOverlay({ swaps, width, height, zIndex = 52 }: Props) {
  const pitch = useMemo(() => inferPitch(width, height), [width, height]);
  const dot = 10;

  return (
    <div className="absolute left-0 top-0 pointer-events-none select-none" style={{ zIndex }}>
      {swaps.map((swap, gi) => {
        const hue = hueForGroup(gi);

        const strokeStrong = hsla(hue, 0.9);
        const fillStrong = hsla(hue, 0.10);

        const dotFill = hsla(hue, 0.7);
        const dotGlow = hsla(hue, 0.35);

        const from = cellTopLeft(swap.from, width);
        const to = cellTopLeft(swap.to, width);

        const tileStyleBase = {
          width: pitch.w,
          height: pitch.h,
          borderRadius: 10,
          border: `2px solid ${strokeStrong}`,
          background: fillStrong,
          boxShadow: `0 0 0 1px ${hsla(hue, 0.25)}, 0 0 18px ${hsla(hue, 0.18)}`,
        } as const;

        return (
          <div key={`swap-${swap.from}-${swap.to}`} className="absolute left-0 top-0">
            {/* Swap tiles (strong) */}
            <div className="absolute" style={{ left: from.x, top: from.y, ...tileStyleBase }} />
            <div className="absolute" style={{ left: to.x, top: to.y, ...tileStyleBase }} />

            {/* Resulting match tiles (light / dot) */}
            {swap.clearIndices.map((idx) => {
              const p = cellTopLeft(idx, width);

              const cx = p.x + pitch.w / 2 - dot / 2;
              const cy = p.y + pitch.h / 2 - dot / 2;

              return (
                <div
                  key={`m-${swap.from}-${swap.to}-${idx}`}
                  className="absolute rounded-full"
                  style={{
                    left: cx,
                    top: cy,
                    width: dot,
                    height: dot,
                    background: dotFill,
                    boxShadow: `0 0 0 2px ${hsla(hue, 0.18)}, 0 0 14px ${dotGlow}`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
