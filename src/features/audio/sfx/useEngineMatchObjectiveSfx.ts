// src/features/audio/sfx/useEngineMatchObjectiveSfx.ts
import { useEffect, useRef } from 'react';

import type { EngineEvent, EngineState } from '@/gamelogic/types';

import type { SfxId } from './sfxManifest';
import { playSfx } from './sfxPlayer';

const MATCH_POP_SFX: readonly SfxId[] = ['matchPop01', 'matchPop02'] as const;
const OBJECTIVE_SFX: readonly SfxId[] = ['matchObjective01', 'matchObjective02'] as const;

function pickRandom<T>(arr: readonly T[]): T {
  // NOTE: UI-only randomness; does not affect engine determinism.
  const n = arr.length;
  if (n <= 1) return arr[0];
  const i = Math.floor(Math.random() * n);
  return arr[Math.min(n - 1, Math.max(0, i))];
}

function isObjectiveProgressEvent(e: EngineEvent): boolean {
  // “Objective hit” is modelled as any progress/activation/damage event across levels.
  // Keep conservative (only events that imply meaningful objective progress).
  switch (e.type) {
    // Level 01
    case 'firewallDamaged':
    case 'firewallDestroyed':
    case 'gateOpened':
      return true;

    // Level 02+
    case 'contaminationCleared':
    case 'leakPatched':
    case 'leakSealed':
    case 'sealKitTriggered':
      return true;

    // Level 03+
    case 'terminalCharged':
    case 'terminalOpened':
    case 'keycardDelivered':
    case 'terminalVerified':
      return true;

    // Level 04+
    case 'objectiveTerminalCharged':
    case 'objectiveTerminalActivated':
      return true;

    // Level 05+
    case 'cellCharged':
    case 'signalLinked':
      return true;

    default:
      return false;
  }
}

function eventSig(e: EngineEvent): string {
  // Used only for best-effort delta recovery when the events ringbuffer caps/overwrites.
  // JSON.stringify is OK here (max 80 events).
  return `${e.type}|${JSON.stringify(e)}`;
}

function computeNewEvents(prev: readonly EngineEvent[] | null, next: readonly EngineEvent[]): EngineEvent[] {
  if (!prev || prev.length === 0) return [...next];
  if (next.length === 0) return [];

  const prevSigs = prev.map(eventSig);
  const nextSigs = next.map(eventSig);

  const prevLastSig = prevSigs[prevSigs.length - 1];

  // Find the best “tail overlap” ending at some index in next, anchored on prev's last event.
  let bestEnd = -1;
  let bestMatchLen = 0;

  for (let i = nextSigs.length - 1; i >= 0; i--) {
    if (nextSigs[i] !== prevLastSig) continue;

    let j = prevSigs.length - 1;
    let k = i;
    let matchLen = 0;

    while (j >= 0 && k >= 0 && prevSigs[j] === nextSigs[k]) {
      j -= 1;
      k -= 1;
      matchLen += 1;
    }

    if (matchLen > bestMatchLen) {
      bestMatchLen = matchLen;
      bestEnd = i;
      if (bestMatchLen === Math.min(prevSigs.length, nextSigs.length)) break;
    }
  }

  if (bestEnd >= 0) return next.slice(bestEnd + 1);

  // No overlap (likely buffer cap or hard reset): treat everything as new.
  return [...next];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function readFiniteInt(v: unknown): number | null {
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  return v | 0;
}

function maxFromNumberArray(v: unknown): number | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  let best: number | null = null;
  for (const x of v) {
    const n = readFiniteInt(x);
    if (n === null) continue;
    best = best === null ? n : Math.max(best, n);
  }
  return best;
}

function isCellLike(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const x = v.x;
  const y = v.y;
  return typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y);
}

function maxFromGroupArrays(v: unknown): number | null {
  if (!Array.isArray(v) || v.length === 0) return null;

  // Expect array of arrays, where each inner array is a group of cells/indices.
  let best: number | null = null;

  for (const g of v) {
    if (!Array.isArray(g)) continue;
    if (g.length === 0) continue;

    // avoid false positives: group elements should look like numbers or {x,y}
    const sample = g[0];
    const ok = typeof sample === 'number' || isCellLike(sample);
    if (!ok) continue;

    best = best === null ? g.length : Math.max(best, g.length);
  }

  return best;
}

function maxFromGroupObjects(v: unknown): number | null {
  if (!Array.isArray(v) || v.length === 0) return null;

  // Expect array of objects, each with a length-ish field.
  const sizeKeys: readonly string[] = ['len', 'length', 'size', 'count', 'n', 'cells', 'indices'];
  let best: number | null = null;

  for (const g of v) {
    if (!isRecord(g)) continue;

    for (const k of sizeKeys) {
      const raw = g[k];
      const n = readFiniteInt(raw);
      if (n !== null) best = best === null ? n : Math.max(best, n);

      // arrays like cells/indices
      if (Array.isArray(raw)) {
        best = best === null ? raw.length : Math.max(best, raw.length);
      }
    }
  }

  return best;
}

function extractMatchLenLike(e: EngineEvent): number | null {
  // We only try to infer "len" for match-ish events to avoid random false positives.
  const t = String(e.type);
  if (t !== 'matchesFound' && !t.toLowerCase().includes('match')) return null;

  if (!isRecord(e)) return null;
  const rec = e as Record<string, unknown>;

  // 1) Common explicit numeric fields
  const numKeys: readonly string[] = [
    'maxLen',
    'bestLen',
    'maxMatchLen',
    'bestMatchLen',
    'maxGroupLen',
    'bestGroupLen',
    'longest',
    'longestLen',
    'matchLen',
    'matchSize',
    'size',
    'len',
    'length',
    'count',
  ];

  for (const k of numKeys) {
    const n = readFiniteInt(rec[k]);
    if (n !== null && n > 0) return n;
  }

  // 2) Arrays of lengths/sizes
  const arrKeys: readonly string[] = ['groupLens', 'groupSizes', 'lens', 'lengths', 'sizes'];
  for (const k of arrKeys) {
    const best = maxFromNumberArray(rec[k]);
    if (best !== null && best > 0) return best;
  }

  // 3) Arrays of groups (arrays)
  const groupArrayKeys: readonly string[] = ['matches', 'groups', 'matchGroups', 'groupCells', 'cellsByGroup', 'groupsCells'];
  for (const k of groupArrayKeys) {
    const best = maxFromGroupArrays(rec[k]);
    if (best !== null && best > 0) return best;

    const bestObj = maxFromGroupObjects(rec[k]);
    if (bestObj !== null && bestObj > 0) return bestObj;
  }

  // 4) Nested "match" / "matches" objects
  const nestedKeys: readonly string[] = ['match', 'matches', 'group'];
  for (const k of nestedKeys) {
    const v = rec[k];
    if (!isRecord(v)) continue;

    for (const nk of numKeys) {
      const n = readFiniteInt(v[nk]);
      if (n !== null && n > 0) return n;
    }

    for (const nk of arrKeys) {
      const best = maxFromNumberArray(v[nk]);
      if (best !== null && best > 0) return best;
    }

    for (const nk of groupArrayKeys) {
      const best = maxFromGroupArrays(v[nk]);
      if (best !== null && best > 0) return best;

      const bestObj = maxFromGroupObjects(v[nk]);
      if (bestObj !== null && bestObj > 0) return bestObj;
    }
  }

  // 5) Last-ditch: common group arrays under very generic keys
  const genericGroupKeys: readonly string[] = ['cells', 'indices', 'indexes', 'tiles', 'positions', 'coords', 'points'];
  for (const k of genericGroupKeys) {
    const v = rec[k];
    if (!Array.isArray(v) || v.length <= 0) continue;

    const sample = v[0];
    const ok = typeof sample === 'number' || isCellLike(sample);
    if (!ok) continue;

    return v.length;
  }

  return null;
}

function bestMatchLenInRange(events: readonly EngineEvent[], start: number, end: number): number {
  let best = 0;

  for (let i = start; i < end; i++) {
    const n = extractMatchLenLike(events[i]);
    if (n === null) continue;
    if (n > best) best = n;
  }

  return best;
}

export function useEngineMatchObjectiveSfx(state: Pick<EngineState, 'events'>): void {
  const isBootstrappedRef = useRef(false);
  const prevEventsRef = useRef<readonly EngineEvent[] | null>(null);

  useEffect(() => {
    const nextEvents = state.events;

    // Suppress initial boot noise (seeded init / stabilizeBoard can emit matchesFound).
    if (!isBootstrappedRef.current) {
      isBootstrappedRef.current = true;
      prevEventsRef.current = nextEvents;
      return;
    }

    const prevEvents = prevEventsRef.current;
    const newEvents = computeNewEvents(prevEvents, nextEvents);
    prevEventsRef.current = nextEvents;

    if (newEvents.length === 0) return;

    // Segment by resolve passes (each starts with matchesFound).
    const matchStarts: number[] = [];
    for (let i = 0; i < newEvents.length; i++) {
      const e = newEvents[i];
      if (e.type !== 'matchesFound') continue;
      if (e.groups <= 0) continue;
      matchStarts.push(i);
    }

    if (matchStarts.length === 0) return;

    for (let m = 0; m < matchStarts.length; m++) {
      const start = matchStarts[m];
      const end = m + 1 < matchStarts.length ? matchStarts[m + 1] : newEvents.length;

      // 1) Pop (always for any match3+)
      playSfx(pickRandom(MATCH_POP_SFX));

      // 2) Optional match4/match5 reward (best match length inside this resolve segment)
      const bestLen = bestMatchLenInRange(newEvents, start, end);
      if (bestLen >= 5) playSfx('match5Sting');
      else if (bestLen === 4) playSfx('match4Chime');

      // 3) Optional objective stinger (if any objective progress occurred in this segment)
      let hitObjective = false;
      for (let i = start; i < end; i++) {
        if (isObjectiveProgressEvent(newEvents[i])) {
          hitObjective = true;
          break;
        }
      }

      if (hitObjective) playSfx(pickRandom(OBJECTIVE_SFX));
    }
  }, [state.events]);
}
