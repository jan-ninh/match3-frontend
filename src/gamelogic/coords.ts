export function indexOf(x: number, y: number, width: number): number {
  return y * width + x;
}

export function xyOf(index: number, width: number): { x: number; y: number } {
  const y = Math.floor(index / width);
  const x = index - y * width;
  return { x, y };
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

export function areAdjacent(a: number, b: number, width: number): boolean {
  if (a === b) return false;

  const ax = a % width;
  const ay = Math.floor(a / width);
  const bx = b % width;
  const by = Math.floor(b / width);

  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);

  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}