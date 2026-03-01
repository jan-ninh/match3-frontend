// src/features/gameplay/lib/match3Engine/effects/useEngineLifecycle.ts
import { useEffect, useLayoutEffect, useRef } from 'react';

import type { EngineAction } from '@/gamelogic';
import type { EngineState } from '@/gamelogic/types';
import { useCampaignTracking } from '@/services/campaign/useCampaignTracking';
import { setRuntimeLevelId } from '@/context/levelRuntime';

type Args = Readonly<{
  dispatch: (a: EngineAction) => void;
  state: EngineState;

  // levelId state (UI-side)
  levelId: number;

  // current engine levelId (engine-side)
  engineLevelId: number;

  // swapMs sync
  engineSwapMs: number;
  desiredSwapMs: number;
}>;

export function useEngineLifecycle({
  dispatch,
  state,
  levelId,
  engineLevelId,
  engineSwapMs,
  desiredSwapMs,
}: Args) {
  // bootstrap monotonic time once (keeps engine-timers stable even if initial state starts at nowMs=0)
  useEffect(() => {
    dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);
  }, [dispatch]);

  // campaign/run tracking (FE → BE)
  useCampaignTracking({ state });

  // Mirror current engine level to a tiny runtime signal for UI-only policies.
  useEffect(() => {
    setRuntimeLevelId(engineLevelId);
  }, [engineLevelId]);

  // keep Engine timing in sync (Engine is the source of truth)
  useLayoutEffect(() => {
    if (engineSwapMs === desiredSwapMs) return;
    dispatch({ type: 'setSwapMs', swapMs: desiredSwapMs, nowMs: performance.now() } as EngineAction);
  }, [desiredSwapMs, engineSwapMs, dispatch]);

  // ensure level change actually re-inits engine (skip first run)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    dispatch({ type: 'initLevel', levelId, nowMs: performance.now() } as EngineAction);
  }, [levelId, dispatch]);
}
