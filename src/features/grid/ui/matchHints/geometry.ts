// src/features/grid/ui/matchHints/geometry.ts
import { cellPixelXY } from '../../lib/math';

export type Pitch = Readonly<{ w: number; h: number }>;
export type CellPos = Readonly<{ x: number; y: number }>;
export type SizePx = Readonly<{ w: number; h: number }>;
export type Point = Readonly<{ x: number; y: number }>;

export function inferPitch(width: number, height: number): Pitch {
  const p00 = cellPixelXY(0, width);

  const p10 = width > 1 ? cellPixelXY(1, width) : p00;
  const p01 = height > 1 ? cellPixelXY(width, width) : p00;

  const dx = Math.max(1, Math.abs((p10?.x ?? 0) - (p00?.x ?? 0)));
  const dy = Math.max(1, Math.abs((p01?.y ?? 0) - (p00?.y ?? 0)));

  return { w: dx, h: dy };
}

export function cellTopLeft(index: number, width: number): CellPos {
  const p = cellPixelXY(index, width);
  return { x: p.x, y: p.y };
}

export function inferBoardSize(width: number, height: number, pitch: Pitch): SizePx {
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

export function cellCenter(index: number, width: number, pitch: Pitch): Point {
  const p = cellTopLeft(index, width);
  return { x: p.x + pitch.w / 2, y: p.y + pitch.h / 2 };
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

export type ArrowPoly = Readonly<{ points: string; tip: Point; base: Point }>;

export function arrowPolygon(
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
