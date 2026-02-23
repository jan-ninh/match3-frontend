// src/features/devtools-host/lib/match3Engine/power/useResetTargetingOnLevelStart.ts
import { useEffect, useRef } from 'react';

import type { EngineState } from '@/gamelogic/types';
import { POWER_ARM_EVENT } from '@/context/powerEvents';

type TurnSeparatorEvent = Readonly<{ type: 'turnSeparator' }>;

function isTurnSeparatorEvent(ev: unknown): ev is TurnSeparatorEvent {
  if (!ev || typeof ev !== 'object') return false;
  return (ev as Record<string, unknown>).type === 'turnSeparator';
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
 * Safety reset:
 * - On EVERY level start, wait until Engine reaches stable-idle (SSOT: `turnSeparator`)
 * - then disarm all targeting powers exactly once for that level.
 *
 * Rationale: prevents "stuck targeting/locked mode" leaking across level transitions
 * (e.g. win triggered mid-lock, then next level starts still armed).
 */
export function useResetTargetingOnLevelStart({ levelId, events }: Args) {
  const lastLevelIdRef = useRef<number | null>(null);
  const pendingResetRef = useRef<boolean>(true);

  // object-identity dedupe (events are stored by reference in EngineState.events)
  const lastHandledSeparatorRef = useRef<TurnSeparatorEvent | null>(null);

  useEffect(() => {
    // level transition => arm-reset becomes pending again, and separator dedupe resets
    if (lastLevelIdRef.current !== levelId) {
      lastLevelIdRef.current = levelId;
      pendingResetRef.current = true;
      lastHandledSeparatorRef.current = null;
    }

    if (!pendingResetRef.current) return;

    // find latest turnSeparator
    let latestSep: TurnSeparatorEvent | null = null;
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (isTurnSeparatorEvent(ev)) {
        latestSep = ev;
        break;
      }
    }

    if (!latestSep) return;
    if (latestSep === lastHandledSeparatorRef.current) return;

    lastHandledSeparatorRef.current = latestSep;

    // execute reset once per level, exactly on first stable-idle separator
    pendingResetRef.current = false;

    // Disarm all known targeting variants (listeners use different aliases).
    emitArm('laser', false);
    emitArm('laserRow', false);
    emitArm('laserRowClear', false);
    emitArm('bomb', false);
    emitArm('gridlaser', false);
  }, [events, levelId]);
}
