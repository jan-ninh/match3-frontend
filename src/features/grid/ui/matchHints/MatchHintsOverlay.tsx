// src/features/grid/ui/matchHints/MatchHintsOverlay.tsx
//
// TERMINOLOGY (SSOT):
// - "Mover" = the PRE-swap tile you take/move (source endpoint).
//   The mover's PIECE ends up in the created match and is CLEARED,
//   but the mover INDEX itself may NOT be in `clearIndices` (post-swap indices).
// - "Anchor" = the POST-swap match slot (destination endpoint) where the match is created;
//   this endpoint IS in `clearIndices` when exactly one endpoint participates in the match.
import { useId, useMemo } from 'react';

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
  const p00 = cellPixelXY(0, width);

  const p10 = width > 1 ? cellPixelXY(1, width) : p00;
  const p01 = height > 1 ? cellPixelXY(width, width) : p00;

  const dx = Math.max(1, Math.abs((p10?.x ?? 0) - (p00?.x ?? 0)));
  const dy = Math.max(1, Math.abs((p01?.y ?? 0) - (p00?.y ?? 0)));

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

  const corners = [0, lastX, lastY * width, lastY * width + lastX];

  let maxX = 0;
  let maxY = 0;

  for (const idx of corners) {
    const p = cellTopLeft(idx, width);
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { w: Math.max(1, Math.ceil(maxX + pitch.w)), h: Math.max(1, Math.ceil(maxY + pitch.h)) };
}

type Point = Readonly<{ x: number; y: number }>;

function cellCenter(index: number, width: number, pitch: Pitch): Point {
  const p = cellTopLeft(index, width);
  return { x: p.x + pitch.w / 2, y: p.y + pitch.h / 2 };
}

type ClearHit = Readonly<{ idx: number; hits: number }>;

function buildClearHitMap(swaps: readonly PossibleMatchSwap[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const s of swaps) {
    for (const i of s.clearIndices) m.set(i, (m.get(i) ?? 0) + 1);
  }
  return m;
}

function maxMapValue(m: Map<number, number>): number {
  let mx = 1;
  for (const v of m.values()) if (v > mx) mx = v;
  return mx;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

type SwapDot = Readonly<{ idx: number; deleted: boolean }>;

function buildSwapDeletedStatusMap(swaps: readonly PossibleMatchSwap[]): Map<number, boolean> {
  const status = new Map<number, boolean>();

  for (const s of swaps) {
    const del = new Set<number>(s.clearIndices);
    const fromDel = del.has(s.from);
    const toDel = del.has(s.to);

    status.set(s.from, (status.get(s.from) ?? false) || fromDel);
    status.set(s.to, (status.get(s.to) ?? false) || toDel);
  }

  return status;
}

function toSwapDots(status: Map<number, boolean>): readonly SwapDot[] {
  const out: SwapDot[] = [];
  for (const [idx, deleted] of status.entries()) out.push({ idx, deleted });
  out.sort((a, b) => a.idx - b.idx);
  return out;
}

type MoverAnchor = Readonly<{ mover: number; anchor: number }>;

function buildMoverToAnchors(swaps: readonly PossibleMatchSwap[]): readonly MoverAnchor[] {
  // SSOT rule (matches your perspective):
  // - Anchor = the endpoint that is in clearIndices (post-swap match slot)
  // - Mover  = the OTHER endpoint (pre-swap source tile you "take" to move into the match)
  // Allow multiple anchors per mover (unique).
  const seen = new Set<string>();
  const out: MoverAnchor[] = [];

  const pushPair = (mover: number, anchor: number) => {
    const k = `${mover}->${anchor}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ mover, anchor });
  };

  for (const s of swaps) {
    const del = new Set<number>(s.clearIndices);
    const fromCleared = del.has(s.from);
    const toCleared = del.has(s.to);

    // If neither endpoint is part of the created match slots, we can't derive a mover/anchor pair.
    if (!fromCleared && !toCleared) continue;

    // Exactly one endpoint is in the created match => mover is the other endpoint.
    if (fromCleared && !toCleared) {
      // match is at FROM slot; the piece you take comes from TO
      pushPair(s.to, s.from);
      continue;
    }
    if (!fromCleared && toCleared) {
      // match is at TO slot; the piece you take comes from FROM
      pushPair(s.from, s.to);
      continue;
    }

    // Both endpoints are in match slots: ambiguous; draw both directions deterministically.
    pushPair(s.from, s.to);
    pushPair(s.to, s.from);
  }

  out.sort((a, b) => a.mover - b.mover || a.anchor - b.anchor);
  return out;
}

type Vec = Readonly<{ x: number; y: number }>;

function vSub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vAdd(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vMul(a: Vec, k: number): Vec {
  return { x: a.x * k, y: a.y * k };
}

function vLen(a: Vec): number {
  return Math.max(1e-6, Math.hypot(a.x, a.y));
}

function vNorm(a: Vec): Vec {
  const l = vLen(a);
  return { x: a.x / l, y: a.y / l };
}

function vPerp(a: Vec): Vec {
  return { x: -a.y, y: a.x };
}

type ArrowPoly = Readonly<{ points: string; tip: Point; base: Point }>;

function arrowPolygon(
  from: Point,
  to: Point,
  opts: Readonly<{
    startTrim: number;
    endTrim: number;
    bodyWidth: number;
    headLength: number;
    headWidth: number;
  }>,
): ArrowPoly {
  const dirRaw = vSub(to, from);
  const dir = vNorm(dirRaw);
  const n = vPerp(dir);

  const start = vAdd(from, vMul(dir, opts.startTrim));
  const tip = vAdd(to, vMul(dir, -opts.endTrim)); // tip sits exactly at arrow end
  const base = vAdd(tip, vMul(dir, -opts.headLength));

  const halfBody = opts.bodyWidth / 2;
  const halfHead = opts.headWidth / 2;

  const p1 = vAdd(start, vMul(n, +halfBody));
  const p2 = vAdd(base, vMul(n, +halfBody));
  const p3 = vAdd(base, vMul(n, +halfHead));
  const p4 = tip;
  const p5 = vAdd(base, vMul(n, -halfHead));
  const p6 = vAdd(base, vMul(n, -halfBody));
  const p7 = vAdd(start, vMul(n, -halfBody));

  const points = [p1, p2, p3, p4, p5, p6, p7].map((p) => `${p.x},${p.y}`).join(' ');
  return { points, tip: { x: tip.x, y: tip.y }, base: { x: base.x, y: base.y } };
}

export default function MatchHintsOverlay({ swaps, width, height, zIndex = 80 }: Props) {
  const pitch = useMemo(() => inferPitch(width, height), [width, height]);
  const boardSize = useMemo(() => inferBoardSize(width, height, pitch), [width, height, pitch]);

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const glowId = `mh-glow-${uid}`;
  const redGlowId = `mh-glow-red-${uid}`;
  const tileGlowId = `mh-tile-glow-${uid}`;

  const CORE = 'rgb(0 240 255)';
  const RED = 'rgb(255 70 90)';
  const BLACK = 'rgb(0 0 0)';

  const GLOW = CORE;
  const RED_GLOW = RED;

  const dotR = 7;

  const clearHitMap = useMemo(() => buildClearHitMap(swaps), [swaps]);
  const maxHits = useMemo(() => maxMapValue(clearHitMap), [clearHitMap]);

  const clearHitsSorted = useMemo<readonly ClearHit[]>(() => {
    const arr: ClearHit[] = [];
    for (const [idx, hits] of clearHitMap.entries()) arr.push({ idx, hits });
    arr.sort((a, b) => a.idx - b.idx);
    return arr;
  }, [clearHitMap]);

  const swapDeletedStatus = useMemo(() => buildSwapDeletedStatusMap(swaps), [swaps]);
  const swapDots = useMemo(() => toSwapDots(swapDeletedStatus), [swapDeletedStatus]);

  // Mover (pre-swap source) -> Anchor (post-swap match slot)
  const moverToAnchors = useMemo(() => buildMoverToAnchors(swaps), [swaps]);

  const inset = 2;
  const effectiveZ = Math.max(zIndex, 1000);

  return (
    <div className="absolute left-0 top-0 pointer-events-none select-none" style={{ zIndex: effectiveZ }}>
      <svg
        width={boardSize.w}
        height={boardSize.h}
        viewBox={`0 0 ${boardSize.w} ${boardSize.h}`}
        className="absolute left-0 top-0"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <filter id={tileGlowId} x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={GLOW} floodOpacity="0.55" />
            <feDropShadow dx="0" dy="0" stdDeviation="7.5" floodColor={GLOW} floodOpacity="0.3" />
          </filter>

          <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={GLOW} floodOpacity="1" />
            <feDropShadow dx="0" dy="0" stdDeviation="8.5" floodColor={GLOW} floodOpacity="0.55" />
          </filter>

          <filter id={redGlowId} x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={RED_GLOW} floodOpacity="1" />
            <feDropShadow dx="0" dy="0" stdDeviation="8.5" floodColor={RED_GLOW} floodOpacity="0.55" />
          </filter>
        </defs>

        {clearHitsSorted.map(({ idx, hits }) => {
          const tl = cellTopLeft(idx, width);
          const intensity = clamp01(hits / Math.max(1, maxHits));

          const fillOpacity = 0.12 + intensity * 0.22;
          const strokeOpacity = 0.18 + intensity * 0.22;

          const x = tl.x + inset;
          const y = tl.y + inset;
          const w = Math.max(1, pitch.w - inset * 2);
          const h = Math.max(1, pitch.h - inset * 2);

          return (
            <rect
              key={`mh-clear-${idx}`}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={8}
              ry={8}
              fill={CORE}
              fillOpacity={fillOpacity}
              stroke={CORE}
              strokeOpacity={strokeOpacity}
              strokeWidth={2}
              filter={`url(#${tileGlowId})`}
            />
          );
        })}

        {/* Cyan arrows: from Mover-center -> Anchor-center; multiple per Mover allowed */}
        {moverToAnchors.map(({ mover, anchor }) => {
          const from = cellCenter(mover, width, pitch);
          const to = cellCenter(anchor, width, pitch);

          const core = arrowPolygon(from, to, {
            startTrim: 0,
            endTrim: 0,
            bodyWidth: 7.5,
            headLength: 18,
            headWidth: 18,
          });

          const outline = arrowPolygon(from, to, {
            startTrim: 0,
            endTrim: 0,
            bodyWidth: 13.5,
            headLength: 20,
            headWidth: 26,
          });

          return (
            <g key={`mh-m2a-${mover}-${anchor}`}>
              <polygon points={outline.points} fill={BLACK} fillOpacity={0.9} />
              <polygon points={core.points} fill={CORE} filter={`url(#${glowId})`} />
            </g>
          );
        })}

        {swapDots.map(({ idx, deleted }) => {
          if (deleted) return null;
          const c = cellCenter(idx, width, pitch);
          return <circle key={`mh-swapdot-${idx}`} cx={c.x} cy={c.y} r={dotR} fill={RED} filter={`url(#${redGlowId})`} />;
        })}
      </svg>
    </div>
  );
}
