import { useEffect } from 'react';

import type { EngineAction } from '@/gamelogic';
import type { EngineState } from '@/gamelogic/types';

type Args = Readonly<{
  dispatch: (a: EngineAction) => void;

  levelId: number;
  phase: EngineState['phase'];

  // Level 09 timer fields
  level9TimerStartSec: number;
  level9TimerDeadlineAtMs: number;
  nowMs: number;

  // Engine-owned delayed item execution (Row-Laser confirm gap)
  pendingLaserRowExecuteAtMs: number;
}>;

export function useTimeSources({ dispatch, levelId, phase, level9TimerStartSec, level9TimerDeadlineAtMs, nowMs, pendingLaserRowExecuteAtMs }: Args) {
  // 0) Low-noise wake-ups (tab return / focus)
  useEffect(() => {
    const wake = () => dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);

    const onFocus = () => wake();
    const onVis = () => {
      if (!document.hidden) wake();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [dispatch]);

  // Engine-owned: delayed laserRow execution (no interactive gap).
  useEffect(() => {
    const at = pendingLaserRowExecuteAtMs | 0;
    if (at <= 0) return;
    if (phase === 'win' || phase === 'lose') return;

    const delay = Math.max(0, at - performance.now());
    const id = window.setTimeout(() => {
      dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);
    }, delay + 5);

    return () => window.clearTimeout(id);
  }, [pendingLaserRowExecuteAtMs, phase, dispatch]);

  // Level 09: timer ticking (engine-owned) — 1Hz, timeout-based (no rAF loop).
  //
  // IMPORTANT:
  // - Timer display depends on EngineState.nowMs.
  // - nowMs only advances when the reducer receives actions (tick/wake/inputs).
  // - Therefore this effect MUST re-run after each tick (dependency includes nowMs),
  //   otherwise it will only update when the player acts.
  useEffect(() => {
    const startSec = level9TimerStartSec | 0;
    if (startSec <= 0) return;

    if (phase === 'win' || phase === 'lose') return;

    const now = performance.now();
    const deadline = level9TimerDeadlineAtMs | 0;

    // Update at most once per second, but also guarantee we tick at the deadline boundary.
    const nextSecond = (Math.floor(now / 1000) + 1) * 1000;
    const targetAt = deadline > 0 ? Math.min(deadline, nextSecond) : nextSecond;

    const delay = Math.max(0, targetAt - now);
    const id = window.setTimeout(() => {
      dispatch({ type: 'tick', nowMs: performance.now() } as EngineAction);
    }, delay + 5);

    return () => window.clearTimeout(id);
  }, [level9TimerStartSec, level9TimerDeadlineAtMs, phase, nowMs, dispatch]);

  // Enemy turn ticker (Level 11 only) — every 3s request one engine-owned enemy swap (engine will ignore if not stable idle).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (levelId !== 11) return; // (Level 11 only)
    if (phase === 'win' || phase === 'lose') return;

    const id = window.setInterval(() => {
      dispatch({ type: 'enemyTurn', nowMs: performance.now() } as EngineAction);
    }, 5000); // every x seconds

    return () => window.clearInterval(id);
  }, [levelId, phase, dispatch]);
}
