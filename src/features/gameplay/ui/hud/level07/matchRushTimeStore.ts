// src/features/gameplay/ui/hud/level07/matchRushTimeStore.ts
import { useSyncExternalStore } from 'react';

let timeLeftSec = 0;

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return timeLeftSec;
}

function getServerSnapshot(): number {
  return 0;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

/** UI-only countdown store for Level 07. */
export function setMatchRushTimeLeftSec(next: number): void {
  const clamped = clampInt(next, 0, 60 * 60);
  if (Object.is(clamped, timeLeftSec)) return;
  timeLeftSec = clamped;
  emit();
}

export function useMatchRushTimeLeftSec(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
