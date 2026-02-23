// src/features/devtools-host/lib/match3Engine/power/useLevel09AutoRearmLaser.ts
import { useEffect, useRef } from 'react';

import type { EngineState } from '@/gamelogic/types';
import { POWER_ARM_EVENT } from '@/context/powerEvents';

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

type TurnSeparatorEvent = Readonly<{ type: 'turnSeparator' }>;

function isTurnSeparatorEvent(ev: unknown): ev is TurnSeparatorEvent {
  if (!ev || typeof ev !== 'object') return false;
  return (ev as Record<string, unknown>).type === 'turnSeparator';
}

type PowerUsedLikeEvent = Readonly<{
  type: 'powerUsed';
  key: string;
  requestId: number;
}>;

function isPowerUsedLikeEvent(ev: unknown): ev is PowerUsedLikeEvent {
  if (!ev || typeof ev !== 'object') return false;
  const r = ev as Record<string, unknown>;
  if (r.type !== 'powerUsed') return false;
  if (typeof r.key !== 'string') return false;
  if (typeof r.requestId !== 'number') return false;
  const id = r.requestId | 0;
  if (id <= 0) return false;
  return true;
}

function emitArm(key: string, armed: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(POWER_ARM_EVENT, { detail: { key, armed } }));
}

type Args = Readonly<{
  levelId: number;
  events: EngineState['events'];
}>;

/**
 * Level 09 QoL:
 * - After a laser row clear fully completes (incl. cascade) and Engine re-enters stable-idle,
 *   auto-arm laser again (as if the user pressed the laser button).
 *
 * Stable-idle SSOT signal: EngineEvent `turnSeparator`.
 */
export function useLevel09AutoRearmLaser({ levelId, events }: Args) {
  const pendingRearmRef = useRef<boolean>(false);

  const seenLaserUsedRef = useRef<SeenRing>({ set: new Set<string>(), order: [] });

  // We use object identity as a safe "event instance" dedupe for turnSeparator.
  const lastTurnSeparatorRef = useRef<TurnSeparatorEvent | null>(null);

  useEffect(() => {
    const isLevel09 = levelId === 9;

    if (!isLevel09) {
      pendingRearmRef.current = false;
      seenLaserUsedRef.current = { set: new Set<string>(), order: [] };
      lastTurnSeparatorRef.current = null;
      return;
    }

    // Ensure we arm once on initial stable-idle after initLevel/resetBoard.
    if (lastTurnSeparatorRef.current === null) {
      pendingRearmRef.current = true;
    }

    // 1) Observe "laser was used" (ack event) and arm on the NEXT stable-idle separator.
    {
      const seen = seenLaserUsedRef.current;

      for (const ev of events) {
        if (!isPowerUsedLikeEvent(ev)) continue;
        if (ev.key !== 'laser') continue;

        const id = `${levelId}:laser:${ev.requestId}`;
        if (!markSeen(seen, id, 256)) continue;

        pendingRearmRef.current = true;
      }
    }

    // 2) Find latest stable-idle separator (Engine SSOT) and rearm exactly once per instance.
    let latestSep: TurnSeparatorEvent | null = null;
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (isTurnSeparatorEvent(ev)) {
        latestSep = ev;
        break;
      }
    }

    if (!latestSep) return;
    if (latestSep === lastTurnSeparatorRef.current) return;

    lastTurnSeparatorRef.current = latestSep;

    if (!pendingRearmRef.current) return;
    pendingRearmRef.current = false;

    // Force "only one targeting power armed" semantics for this QoL.
    emitArm('bomb', false);
    emitArm('gridlaser', false);

    emitArm('laser', true);
  }, [events, levelId]);
}
