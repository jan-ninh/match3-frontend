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

export type MatchTier = 'm3' | 'm4' | 'm5p';

function tierOfLen(len: number): MatchTier {
  if (len >= 5) return 'm5p';
  if (len === 4) return 'm4';
  return 'm3';
}

function tierRank(t: MatchTier): number {
  switch (t) {
    case 'm5p':
      return 3;
    case 'm4':
      return 2;
    case 'm3':
      return 1;
  }
}

function maxTier(a: MatchTier, b: MatchTier): MatchTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

function deriveSwapTier(s: PossibleMatchSwap): MatchTier {
  let mx = 3;
  for (const r of s.runs) if (r.len > mx) mx = r.len;
  return tierOfLen(mx);
}

export type MoverAnchor = Readonly<{ mover: number; anchor: number; tier: MatchTier }>;

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
 *
 * Color rule:
 * - Tier is derived from `max(s.runs[].len)` (SSOT).
 * - If multiple swaps produce the same arrow (mover->anchor), keep the highest tier.
 */
export function buildMoverToAnchors(swaps: readonly PossibleMatchSwap[]): readonly MoverAnchor[] {
  const byPair = new Map<string, MoverAnchor>();

  const upsertPair = (mover: number, anchor: number, tier: MatchTier) => {
    const k = `${mover}->${anchor}`;
    const prev = byPair.get(k);
    if (!prev) {
      byPair.set(k, { mover, anchor, tier });
      return;
    }
    byPair.set(k, { mover, anchor, tier: maxTier(prev.tier, tier) });
  };

  for (const s of swaps) {
    const del = new Set<number>(s.clearIndices);
    const fromCleared = del.has(s.from);
    const toCleared = del.has(s.to);

    if (!fromCleared && !toCleared) continue;

    const tier = deriveSwapTier(s);

    if (fromCleared && !toCleared) {
      upsertPair(s.to, s.from, tier);
      continue;
    }
    if (!fromCleared && toCleared) {
      upsertPair(s.from, s.to, tier);
      continue;
    }

    upsertPair(s.from, s.to, tier);
    upsertPair(s.to, s.from, tier);
  }

  const out = Array.from(byPair.values());
  out.sort((a, b) => a.mover - b.mover || a.anchor - b.anchor);
  return out;
}

export function clearHitsSortedFromMap(clearHitMap: Map<number, number>): readonly ClearHit[] {
  const arr: ClearHit[] = [];
  for (const [idx, hits] of clearHitMap.entries()) arr.push({ idx, hits });
  arr.sort((a, b) => a.idx - b.idx);
  return arr;
}
