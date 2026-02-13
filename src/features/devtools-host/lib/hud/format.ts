// src/features/devtools-host/lib/hud/format.ts

export function clampInt(v: number, min: number, max: number): number {
  const n = v | 0;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function formatFraction(done: number, total: number): string {
  const t = Math.max(0, total | 0);
  const d = Math.max(0, done | 0);
  return `${d}/${t}`;
}

export function formatMovesLeft(movesLeft: number | string): string {
  if (typeof movesLeft === 'number' && Number.isFinite(movesLeft)) return String(movesLeft | 0);
  if (typeof movesLeft === 'string' && movesLeft.trim().length > 0) return movesLeft;
  return '—';
}

export function formatLaserWarning(kind: 'row' | 'col', index: number): string {
  const label = kind === 'row' ? 'Row' : 'Col';
  return `${label} ${index + 1}`;
}
