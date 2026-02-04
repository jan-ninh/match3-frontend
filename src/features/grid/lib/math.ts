import { GAP, TILE_SIZE } from './constants';
import { xyOf } from '@/gamelogic';

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function sign(n: number): -1 | 0 | 1 {
  return n === 0 ? 0 : n > 0 ? 1 : -1;
}

export function cellPixelXY(index: number, width: number): { x: number; y: number } {
  const { x, y } = xyOf(index, width);
  return {
    x: x * (TILE_SIZE + GAP),
    y: y * (TILE_SIZE + GAP),
  };
}

export function boardInnerSizePx(width: number, height: number): { w: number; h: number } {
  const w = width * TILE_SIZE + (width - 1) * GAP;
  const h = height * TILE_SIZE + (height - 1) * GAP;
  return { w, h };
}
