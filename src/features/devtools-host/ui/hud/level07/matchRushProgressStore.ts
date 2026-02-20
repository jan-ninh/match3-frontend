import { useSyncExternalStore } from 'react';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

let percent = 0;

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return percent;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * UI-only store for Level 07 match progress.
 * This is intentionally NOT part of the engine state (display only).
 */
export function setMatchRushPercent(next: number): void {
  const clamped = clamp(next, 0, 100);
  if (Object.is(clamped, percent)) return;
  percent = clamped;
  emit();
}

export function useMatchRushPercent(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
