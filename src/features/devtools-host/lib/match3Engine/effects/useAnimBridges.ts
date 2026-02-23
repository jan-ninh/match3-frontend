import { useEffect } from 'react';

import type { EngineAction } from '@/gamelogic';
import type { EngineState } from '@/gamelogic/types';

type Args = Readonly<{
  dispatch: (a: EngineAction) => void;
  anim: EngineState['anim'] | null | undefined;
}>;

export function useAnimBridges({ dispatch, anim }: Args) {
  const animKind = anim?.kind;
  const animToken = anim?.token;
  const animDurationMs = anim?.durationMs;
  const animDeadlineAtMs = anim?.deadlineAtMs;

  // 1) UI → Engine "done" bridge (NO rAF loop)
  useEffect(() => {
    if (!animKind) return;
    if (animToken == null) return;
    if (animDurationMs == null) return;

    const id = window.setTimeout(() => {
      const now = performance.now();

      // keep engine clock fresh so follow-up beginAnim uses correct nowMs
      dispatch({ type: 'wake', nowMs: now } as EngineAction);

      if (animKind === 'swap') {
        dispatch({ type: 'swapAnimDone', token: animToken, nowMs: now } as EngineAction);
        return;
      }

      if (animKind === 'swapBack') {
        dispatch({ type: 'swapBackAnimDone', token: animToken, nowMs: now } as EngineAction);
        return;
      }

      if (animKind === 'fall') {
        dispatch({ type: 'fallAnimDone', token: animToken, nowMs: now } as EngineAction);
        return;
      }
    }, animDurationMs);

    return () => window.clearTimeout(id);
  }, [animToken, animKind, animDurationMs, dispatch]);

  // 2) Deadline fallback (single timer, no per-frame ticking)
  useEffect(() => {
    if (animToken == null) return;
    if (animDeadlineAtMs == null) return;

    const delay = Math.max(0, animDeadlineAtMs - performance.now());
    const id = window.setTimeout(() => {
      dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);
    }, delay + 5);

    return () => window.clearTimeout(id);
  }, [animToken, animDeadlineAtMs, dispatch]);
}
