// src/features/gameplay/lib/match3Engine/power/usePowerBridge.ts
import { useEffect, useRef } from 'react';

import type { EngineAction } from '@/gamelogic';
import type { EngineState } from '@/gamelogic/types';
import {
  POWER_CONSUME_EVENT,
  POWER_USE_AT_EVENT,
  POWER_USE_EVENT,
  type PowerConsumeDetail,
  type PowerUseAtDetail,
  type PowerUseDetail,
} from '@/context/powerEvents';
import type { PowerKey } from '@/types';

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

function isPowerKey(v: unknown): v is PowerKey {
  return v === 'gridlaser' || v === 'bomb' || v === 'laser' || v === 'extraShuffle';
}

type PowerUsedEvent = Readonly<{
  type: 'powerUsed';
  key: PowerKey;
  requestId: number;
}>;

function isPowerUsedEvent(ev: unknown): ev is PowerUsedEvent {
  if (!ev || typeof ev !== 'object') return false;
  const r = ev as Record<string, unknown>;
  if (r.type !== 'powerUsed') return false;
  if (!isPowerKey(r.key)) return false;
  if (typeof r.requestId !== 'number') return false;
  const id = r.requestId | 0;
  if (id <= 0) return false;
  return true;
}

type Args = Readonly<{
  accountAttemptId?: string;
  guestBinding?: { runId: string; attemptId: string };
  dispatch: (a: EngineAction) => void;
  levelId: number;
  events: EngineState['events'];
  allocPowerRequestId: (maybe: unknown) => number;
}>;

export function usePowerBridge({ dispatch, levelId, events, allocPowerRequestId, guestBinding, accountAttemptId }: Args) {
  // The route owns this mounted engine's binding; delayed events retain that owner.
  const guestRunId = guestBinding?.runId;
  const guestAttemptId = guestBinding?.attemptId;
  // Power → Engine bridge (non-targeted)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUse = (e: Event) => {
      const ce = e as CustomEvent<PowerUseDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'extraShuffle') return;

      const requestId = allocPowerRequestId(d.requestId);

      dispatch({ type: 'reshuffle', requestId, nowMs: performance.now() } as EngineAction);
    };

    window.addEventListener(POWER_USE_EVENT, onUse as EventListener);
    return () => window.removeEventListener(POWER_USE_EVENT, onUse as EventListener);
  }, [allocPowerRequestId, dispatch]);

  // Power → Engine bridge (Bomb/Laser targeting confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUseAt = (e: Event) => {
      const ce = e as CustomEvent<PowerUseAtDetail>;
      const d = ce.detail;
      if (!d) return;

      // Use runtime string compare to avoid TS "no overlap" if PowerUseAtDetail.key union lags behind.
      const powerKey = String(d.key);

      let itemKey: 'bomb3x3' | 'laserRow';
      if (powerKey === 'gridlaser' || powerKey === 'bomb') itemKey = 'bomb3x3';
      else if (powerKey === 'laser' || powerKey === 'laserRow' || powerKey === 'laserRowClear') itemKey = 'laserRow';
      else return;

      const t = d.target;
      if (!t || typeof t.x !== 'number' || typeof t.y !== 'number') return;

      const requestId = allocPowerRequestId(d.requestId);

      dispatch({
        type: 'useItemAt',
        key: itemKey,
        target: { x: t.x | 0, y: t.y | 0 },
        requestId,
        nowMs: performance.now(),
      } as EngineAction);
    };

    window.addEventListener(POWER_USE_AT_EVENT, onUseAt as EventListener);
    return () => window.removeEventListener(POWER_USE_AT_EVENT, onUseAt as EventListener);
  }, [allocPowerRequestId, dispatch]);

  // EngineEvent `powerUsed` → UI consume (ack-driven)
  const seenPowerUsedRef = useRef<SeenRing>({ set: new Set<string>(), order: [] });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seen = seenPowerUsedRef.current;

    for (const ev of events) {
      if (!isPowerUsedEvent(ev)) continue;

      // include levelId to avoid cross-level requestId collisions
      const id = `${levelId}:${ev.key}:${ev.requestId}`;
      if (!markSeen(seen, id, 256)) continue;

      window.dispatchEvent(
        new CustomEvent<PowerConsumeDetail>(POWER_CONSUME_EVENT, {
          detail: { key: ev.key, amount: 1, requestId: ev.requestId, guestRunId, guestAttemptId, accountAttemptId },
        }),
      );
    }
  }, [events, levelId, guestRunId, guestAttemptId, accountAttemptId]);
}
