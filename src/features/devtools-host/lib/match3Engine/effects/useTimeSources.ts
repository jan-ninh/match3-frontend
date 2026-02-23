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

  // Enemy turn scheduling (engine-owned; UI only supplies clock ticks)
  enemyTurnEnabled: boolean;
  nextEnemyTurnAtMs: number;
}>;

export function useTimeSources({
  dispatch,
  levelId,
  phase,
  level9TimerStartSec,
  level9TimerDeadlineAtMs,
  nowMs,
  pendingLaserRowExecuteAtMs,
  enemyTurnEnabled,
  nextEnemyTurnAtMs,
}: Args) {
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

  // Kick: ensure we leave nowMs=0 even without user input (needed for engine-owned timers).
  useEffect(() => {
    dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);
  }, [dispatch, levelId]);

  // Engine clock freshness — timeout-based (no rAF loop).
  // The engine is the SSOT; UI only injects monotonic time via tick/wake so the reducer
  // can advance deadlines (Level 09 timer, delayed items, enemy schedule, auto-finish, etc).
  useEffect(() => {
    if (phase === 'win' || phase === 'lose') return;

    const now = performance.now();

    const nextSecond = (Math.floor(now / 1000) + 1) * 1000;
    const targets: number[] = [nextSecond];

    // Level 09: timer deadline
    const deadline = level9TimerDeadlineAtMs | 0;
    if ((level9TimerStartSec | 0) > 0 && deadline > 0) targets.push(deadline);

    // delayed item execution (laserRow)
    const pendingAt = pendingLaserRowExecuteAtMs | 0;
    if (pendingAt > 0) targets.push(pendingAt);

    // Enemy schedule: engine-owned nextEnemyTurnAtMs (0 when not initialized)
    const nextEnemy = nextEnemyTurnAtMs | 0;
    if (enemyTurnEnabled && nextEnemy > 0) targets.push(nextEnemy);

    const targetAt = Math.min(...targets);
    const delay = Math.max(0, targetAt - now);

    const id = window.setTimeout(() => {
      dispatch({ type: 'tick', nowMs: performance.now() } as EngineAction);
    }, delay + 5);

    return () => window.clearTimeout(id);
  }, [
    level9TimerStartSec,
    level9TimerDeadlineAtMs,
    pendingLaserRowExecuteAtMs,
    enemyTurnEnabled,
    nextEnemyTurnAtMs,
    phase,
    nowMs,
    dispatch,
  ]);
}
