// src/features/grid/ui/matchHints/model.ts
import type { PossibleMatchSwap } from '@/gamelogic/match';

export type ClearHit = Readonly<{ idx: number; hits: number }>;

export function buildClearHitMap(swaps: readonly PossibleMatchSwap[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const s of swaps) {
    for (const i of s.clearIndices) m.set(i, (m.get(i) ?? 0) + 1);
  }
  return m;
}

export function maxMapValue(m: Map<number, number>): number {
  let mx = 1;
  for (const v of m.values()) if (v > mx) mx = v;
  return mx;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export type SwapDot = Readonly<{ idx: number; deleted: boolean }>;

export function buildSwapDeletedStatusMap(swaps: readonly PossibleMatchSwap[]): Map<number, boolean> {
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

export function toSwapDots(status: Map<number, boolean>): readonly SwapDot[] {
  const out: SwapDot[] = [];
  for (const [idx, deleted] of status.entries()) out.push({ idx, deleted });
  out.sort((a, b) => a.idx - b.idx);
  return out;
}

export type MoverAnchor = Readonly<{ mover: number; anchor: number }>;

/**
 * TERMINOLOGY (SSOT)
 * - "Mover" = the PRE-swap tile you take/move (source endpoint).
 *   The mover's PIECE ends up in the created match and is CLEARED,
 *   but the mover INDEX itself may NOT be in `clearIndices` (post-swap indices).
 * - "Anchor" = the POST-swap match slot (destination endpoint) where the match is created.
 *
 * Derivation rule (deterministic):
 * - If exactly one endpoint (from/to) is in `clearIndices`,
 *   then Anchor = that endpoint, and Mover = the other endpoint.
 * - If both endpoints are in `clearIndices`, draw both directions (no arbitrary choice).
 * - If neither endpoint is in `clearIndices`, skip (can't derive a match anchor).
 */
export function buildMoverToAnchors(swaps: readonly PossibleMatchSwap[]): readonly MoverAnchor[] {
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

    if (!fromCleared && !toCleared) continue;

    if (fromCleared && !toCleared) {
      pushPair(s.to, s.from);
      continue;
    }
    if (!fromCleared && toCleared) {
      pushPair(s.from, s.to);
      continue;
    }

    pushPair(s.from, s.to);
    pushPair(s.to, s.from);
  }

  out.sort((a, b) => a.mover - b.mover || a.anchor - b.anchor);
  return out;
}

export function clearHitsSortedFromMap(clearHitMap: Map<number, number>): readonly ClearHit[] {
  const arr: ClearHit[] = [];
  for (const [idx, hits] of clearHitMap.entries()) arr.push({ idx, hits });
  arr.sort((a, b) => a.idx - b.idx);
  return arr;
}
