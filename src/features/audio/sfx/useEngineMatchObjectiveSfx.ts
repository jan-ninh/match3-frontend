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

      // 2) Optional objective stinger (if any objective progress occurred in this segment)
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
