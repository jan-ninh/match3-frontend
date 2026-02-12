// src/gamelogic/board/math/distance.ts
export function manhattanDist(a: number, b: number, width: number): number {
  const ax = a % width;
  const ay = Math.floor(a / width);
  const bx = b % width;
  const by = Math.floor(b / width);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
