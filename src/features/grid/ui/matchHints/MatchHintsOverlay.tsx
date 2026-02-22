// src/features/grid/ui/matchHints/MatchHintsOverlay.tsx
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

type CellPos = Readonly<{ x: number; y: number }>;

function cellTopLeft(index: number, width: number): CellPos {
  const p = cellPixelXY(index, width);
  return { x: p.x, y: p.y };
}

type SizePx = Readonly<{ w: number; h: number }>;

function inferBoardSize(width: number, height: number, pitch: Pitch): SizePx {
  if (width <= 0 || height <= 0) return { w: 1, h: 1 };

  const lastX = Math.max(0, width - 1);
  const lastY = Math.max(0, height - 1);

  const i00 = 0;
  const iTR = lastX;
  const iBL = lastY * width;
  const iBR = lastY * width + lastX;

  const corners = [i00, iTR, iBL, iBR];

  let maxX = 0;
  let maxY = 0;

  for (const idx of corners) {
    const p = cellTopLeft(idx, width);
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  // include the tile size itself
  const w = Math.max(1, Math.ceil(maxX + pitch.w));
  const h = Math.max(1, Math.ceil(maxY + pitch.h));
  return { w, h };
}

type Point = Readonly<{ x: number; y: number }>;

function cellCenter(index: number, width: number, pitch: Pitch): Point {
  const p = cellTopLeft(index, width);
  return { x: p.x + pitch.w / 2, y: p.y + pitch.h / 2 };
}

export default function MatchHintsOverlay({ swaps, width, height, zIndex = 80 }: Props) {
  const pitch = useMemo(() => inferPitch(width, height), [width, height]);
  const boardSize = useMemo(() => inferBoardSize(width, height, pitch), [width, height, pitch]);

  // One strong, consistent color for fast scanning.
  const CORE = 'rgba(200, 255, 0, 0.96)';
  const OUTLINE = 'rgba(0, 0, 0, 0.78)';
  const GLOW = 'rgba(200, 255, 0, 0.35)';

  const strokeOutline = 7;
  const strokeCore = 4;

  const dotR = 4.5;

  return (
    <div className="absolute left-0 top-0 pointer-events-none select-none" style={{ zIndex }}>
      <svg width={boardSize.w} height={boardSize.h} viewBox={`0 0 ${boardSize.w} ${boardSize.h}`} className="absolute left-0 top-0" aria-hidden="true">
        <defs>
          <filter id="mh-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={GLOW} floodOpacity="1" />
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={GLOW} floodOpacity="0.55" />
          </filter>

          <marker id="mh-arrow-head-outline" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L14,7 L0,14 L3,7 Z" fill={OUTLINE} />
          </marker>

          <marker id="mh-arrow-head-core" markerWidth="12" markerHeight="12" refX="10.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L12,6 L0,12 L2.6,6 Z" fill={CORE} />
          </marker>
        </defs>

        {swaps.map((swap) => {
          const a = cellCenter(swap.from, width, pitch);
          const b = cellCenter(swap.to, width, pitch);

          // small trim so the arrowhead doesn't fully cover the destination center-dot zone
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.max(1, Math.hypot(dx, dy));
          const trim = 6; // px
          const x2 = b.x - (dx / len) * trim;
          const y2 = b.y - (dy / len) * trim;

          return (
            <g key={`swap-${swap.from}-${swap.to}`}>
              {/* Outline */}
              <line
                x1={a.x}
                y1={a.y}
                x2={x2}
                y2={y2}
                stroke={OUTLINE}
                strokeWidth={strokeOutline}
                strokeLinecap="round"
                markerEnd="url(#mh-arrow-head-outline)"
              />
              {/* Core */}
              <line
                x1={a.x}
                y1={a.y}
                x2={x2}
                y2={y2}
                stroke={CORE}
                strokeWidth={strokeCore}
                strokeLinecap="round"
                markerEnd="url(#mh-arrow-head-core)"
                filter="url(#mh-glow)"
              />

              {/* Start dot (indicates “move this tile”) */}
              <circle cx={a.x} cy={a.y} r={dotR} fill={CORE} stroke={OUTLINE} strokeWidth={2} filter="url(#mh-glow)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
