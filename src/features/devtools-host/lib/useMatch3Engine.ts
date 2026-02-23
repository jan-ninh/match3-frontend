// src/features/devtools-host/lib/useMatch3Engine.ts
import { useCallback, useEffect, useReducer, useState } from 'react';

import type { EngineAction } from '@/gamelogic';
import { createInitialState, engineReducer, SWAP_MS } from '@/gamelogic';

import { useEngineLifecycle } from './match3Engine/effects/useEngineLifecycle';
import { useTimeSources } from './match3Engine/effects/useTimeSources';
import { useAnimBridges } from './match3Engine/effects/useAnimBridges';
import { useMatchRewardSfx } from './match3Engine/effects/useMatchRewardSfx';

import { usePowerRequestIdAllocator } from './match3Engine/power/usePowerRequestIdAllocator';
import { usePowerBridge } from './match3Engine/power/usePowerBridge';
import { useResetTargetingOnInitLevel } from './match3Engine/power/useResetTargetingOnInitLevel';
import { useLevel09AutoRearmLaser } from './match3Engine/power/useLevel09AutoRearmLaser';

import { useIntentRouter } from './match3Engine/input/useIntentRouter';

type Args = {
  initialLevelId?: number;
};

export function useMatch3Engine({ initialLevelId = 1 }: Args) {
  const isDev = import.meta.env.DEV;

  const [levelId, setLevelId] = useState<number>(initialLevelId);

  // reduced motion => swapMs=0
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const apply = () => setReducedMotion(!!mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      void e;
      apply();
    };

    apply();

    // modern browsers
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    // legacy Safari fallback (no type-guard that narrows to never)
    const legacy = mq as unknown as {
      addListener?: (l: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (l: (e: MediaQueryListEvent) => void) => void;
    };

    legacy.addListener?.(handler);
    return () => legacy.removeListener?.(handler);
  }, []);

  const [state, dispatch] = useReducer(engineReducer, levelId, createInitialState);

  // keep Engine timing in sync (Engine is the source of truth)
  const desiredSwapMs = reducedMotion ? 0 : SWAP_MS;

  // Composition: lifecycle + time sources + bridges + boundaries
  useEngineLifecycle({
    dispatch,
    state,
    levelId,
    engineLevelId: state.levelId,
    engineSwapMs: state.swapMs,
    desiredSwapMs,
  });

  useTimeSources({
    dispatch,
    levelId: state.levelId,
    phase: state.phase,
    level9TimerStartSec: state.level9TimerStartSec,
    level9TimerDeadlineAtMs: state.level9TimerDeadlineAtMs,
    nowMs: state.nowMs,
    pendingLaserRowExecuteAtMs: state.pendingLaserRow?.executeAtMs ?? 0,
    enemyTurnEnabled: state.enemyTurnEnabled,
    nextEnemyTurnAtMs: state.nextEnemyTurnAtMs,
  });

  const { allocPowerRequestId } = usePowerRequestIdAllocator();

  usePowerBridge({
    dispatch,
    levelId: state.levelId,
    events: state.events,
    allocPowerRequestId,
  });

  // Safety baseline: on each initLevel boundary, disarm targeting at the first stable-idle separator after it.
  // Prevents "stuck targeting/locked mode" leaking across level transitions.
  useResetTargetingOnInitLevel({ events: state.events });

  // Level 09 QoL (engine-signal-based): auto-rearm laser on stable-idle separator.
  // Order matters: reset runs before auto-rearm in the same stable-idle tick.
  useLevel09AutoRearmLaser({ levelId: state.levelId, events: state.events });

  useMatchRewardSfx({ events: state.events });

  useAnimBridges({ dispatch, anim: state.anim });

  const { canSwapAt, onIntent } = useIntentRouter({
    dispatch,
    width: state.width,
    height: state.height,
    cells: state.cells,
    allocPowerRequestId,
  });

  const onDevResetBoard = useCallback(() => {
    dispatch({ type: 'resetBoard', nowMs: performance.now() as number } as EngineAction);
  }, [dispatch]);

  const onDevNextLevel = useCallback(() => setLevelId((v) => v + 1), []);
  const onDevPrevLevel = useCallback(() => setLevelId((v) => Math.max(1, v - 1)), []);
  const onDevSetLevel = useCallback((id: number) => setLevelId(() => Math.max(1, id | 0)), []);

  return {
    isDev,
    state,
    inputLocked: state.inputLocked,

    events: state.events,

    canSwapAt,
    onIntent,

    onDevResetBoard,
    onDevNextLevel,
    onDevPrevLevel,
    onDevSetLevel,
  };
}
