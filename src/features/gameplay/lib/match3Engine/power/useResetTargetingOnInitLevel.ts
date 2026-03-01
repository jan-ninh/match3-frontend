// src/features/gameplay/lib/match3Engine/power/useResetTargetingOnInitLevel.ts
// src/features/gameplay/lib/match3Engine/power/useResetTargetingOnInitLevel.ts
// src/features/gameplay/lib/match3Engine/power/useResetTargetingOnInitLevel.ts
import { useEffect, useRef } from 'react';

import type { EngineState } from '@/gamelogic/types';
import { POWER_ARM_EVENT } from '@/context/powerEvents';

type TurnSeparatorEvent = Readonly<{ type: 'turnSeparator' }>;

function isTurnSeparatorEvent(ev: unknown): ev is TurnSeparatorEvent {
  if (!ev || typeof ev !== 'object') return false;
  return (ev as Record<string, unknown>).type === 'turnSeparator';
}

type InitLevelHardBoundaryEvent = Readonly<{
  type: 'hardBoundary';
  kind: 'initLevel';
  nowMs: number;
  animTokenBase: number;
}>;

function isInitLevelHardBoundaryEvent(ev: unknown): ev is InitLevelHardBoundaryEvent {
  if (!ev || typeof ev !== 'object') return false;
  const r = ev as Record<string, unknown>;
  if (r.type !== 'hardBoundary') return false;
  if (r.kind !== 'initLevel') return false;
  if (typeof r.nowMs !== 'number') return false;
  if (typeof r.animTokenBase !== 'number') return false;
  return true;
}

function emitArm(key: string, armed: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(POWER_ARM_EVENT, { detail: { key, armed } }));
}

function disarmAllTargetingPowers(): void {
  // Disarm all known targeting variants (different listeners use different aliases).
  emitArm('laser', false);
  emitArm('laserRow', false);
  emitArm('laserRowClear', false);
  emitArm('bomb', false);
  emitArm('gridlaser', false);
}

type Args = Readonly<{
  events: EngineState['events'];
}>;

/**
 * Best-practice bridge:
 * - Engine signal for "a new level started" is `hardBoundary(kind:'initLevel')` (already emitted by handleInitLevel/createState).
 * - We then wait for the first `turnSeparator` *after that boundary* (SSOT: stable-idle reached).
 * - At that moment, we reset any UI targeting/armed mode to a clean baseline (disarm).
 */
export function useResetTargetingOnInitLevel({ events }: Args) {
  const lastInitBoundaryIdRef = useRef<string | null>(null);

  // We only accept a turnSeparator that occurs AFTER the initLevel hardBoundary we observed.
  const pendingInitBoundaryIndexRef = useRef<number | null>(null);
  const pendingResetRef = useRef<boolean>(false);

  // object-identity dedupe for the separator instance we used
  const lastHandledSeparatorRef = useRef<TurnSeparatorEvent | null>(null);

  useEffect(() => {
    // 1) Detect latest initLevel hardBoundary in the event ring
    let boundary: InitLevelHardBoundaryEvent | null = null;
    let boundaryIndex = -1;

    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (isInitLevelHardBoundaryEvent(ev)) {
        boundary = ev;
        boundaryIndex = i;
        break;
      }
    }

    if (boundary) {
      const id = `${boundary.nowMs}:${boundary.animTokenBase}`;
      if (id !== lastInitBoundaryIdRef.current) {
        lastInitBoundaryIdRef.current = id;
        pendingInitBoundaryIndexRef.current = boundaryIndex;
        pendingResetRef.current = true;
        lastHandledSeparatorRef.current = null;
      }
    }

    // 2) If a reset is pending, execute it exactly once on the first separator AFTER boundary
    if (!pendingResetRef.current) return;

    const startIdx = pendingInitBoundaryIndexRef.current;
    if (startIdx == null || startIdx < 0) return;

    let sep: TurnSeparatorEvent | null = null;
    for (let i = startIdx + 1; i < events.length; i++) {
      const ev = events[i];
      if (isTurnSeparatorEvent(ev)) {
        sep = ev;
        break;
      }
    }

    if (!sep) return;
    if (sep === lastHandledSeparatorRef.current) return;

    lastHandledSeparatorRef.current = sep;
    pendingResetRef.current = false;

    disarmAllTargetingPowers();
  }, [events]);
}
