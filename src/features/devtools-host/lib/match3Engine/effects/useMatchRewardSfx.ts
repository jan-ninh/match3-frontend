import { useEffect, useRef } from 'react';

import type { EngineState } from '@/gamelogic/types';
import { playSfx } from '@/features/audio';

type SeenRing = {
  set: Set<string>;
  order: string[];
};

function markSeen(seen: SeenRing, id: string, max: number): boolean {
  if (seen.set.has(id)) return false;
  seen.set.add(id);
  seen.order.push(id);

  while (seen.order.length > max) {
    const oldest = seen.order.shift();
    if (oldest) seen.set.delete(oldest);
  }

  return true;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function extractMatchLen(ev: unknown): number | null {
  if (!isRecord(ev)) return null;

  const t = ev.type;
  if (typeof t !== 'string') return null;

  // Keep this conservative to avoid false positives.
  if (!/match/i.test(t)) return null;

  const numKeys: readonly string[] = ['len', 'size', 'count', 'matchLen', 'matchSize'] as const;
  for (const k of numKeys) {
    const v = ev[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  }

  const arrKeys: readonly string[] = ['cells', 'indices', 'indexes', 'tiles', 'positions', 'coords', 'points', 'group'] as const;
  for (const k of arrKeys) {
    const v = ev[k];
    if (Array.isArray(v)) return v.length;
  }

  // Some events may carry a single match group under a nested key.
  const g = ev.match;
  if (Array.isArray(g)) return g.length;

  return null;
}

function extractMatchEventId(ev: unknown, matchLen: number, fallbackIndex: number): string | null {
  if (!isRecord(ev)) return null;

  const t = ev.type;
  if (typeof t !== 'string' || t.length === 0) return null;

  const idKeys: readonly string[] = ['id', 'eventId', 'seq', 'token'] as const;
  for (const k of idKeys) {
    const v = ev[k];
    if (typeof v === 'number' && Number.isFinite(v)) return `${t}:${k}:${Math.floor(v)}`;
    if (typeof v === 'string' && v.length > 0) return `${t}:${k}:${v}`;
  }

  const at = ev.atMs ?? ev.nowMs ?? ev.timeMs;
  if (typeof at === 'number' && Number.isFinite(at)) return `${t}:at:${Math.floor(at)}:len:${matchLen}`;

  // Last resort: stable-ish fingerprint (best-effort).
  try {
    const s = JSON.stringify(ev);
    if (typeof s === 'string' && s.length > 0) return `${t}:len:${matchLen}:json:${s.slice(0, 180)}`;
  } catch {
    // ignore
  }

  return `${t}:len:${matchLen}:i:${fallbackIndex}`;
}

type Args = Readonly<{
  events: EngineState['events'];
}>;

export function useMatchRewardSfx({ events }: Args) {
  // Match4/5 reward SFX (event-driven, deduped)
  const seenMatchSfxRef = useRef<SeenRing>({ set: new Set<string>(), order: [] });

  useEffect(() => {
    const seen = seenMatchSfxRef.current;

    let best = 0;

    for (let i = 0; i < events.length; i += 1) {
      const ev = events[i];
      const len = extractMatchLen(ev);
      if (len == null || len < 4) continue;

      const id = extractMatchEventId(ev, len, i);
      if (!id) continue;
      if (!markSeen(seen, id, 512)) continue;

      if (len > best) best = len;
    }

    if (best >= 5) {
      playSfx('match5Sting');
      return;
    }

    if (best === 4) {
      playSfx('match4Chime');
    }
  }, [events]);
}
