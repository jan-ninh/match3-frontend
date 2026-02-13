// src\features\devtools-host\lib\useMatch3Engine.ts
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import type { EngineAction } from '@/gamelogic';
import { canSwap, createInitialState, engineReducer, SWAP_MS } from '@/gamelogic';

type Args = {
  initialLevelId?: number;
};

export type PowerArmDetail = { key: 'bomb'; armed: boolean };
type PowerUseAtDetail = { key: 'bomb'; index: number };

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
  useLayoutEffect(() => {
    if (state.swapMs === desiredSwapMs) return;
    dispatch({ type: 'setSwapMs', swapMs: desiredSwapMs, nowMs: performance.now() } as EngineAction);
  }, [desiredSwapMs, state.swapMs]);

  // ensure level change actually re-inits engine (skip first run)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    dispatch({ type: 'initLevel', levelId, nowMs: performance.now() } as EngineAction);
  }, [levelId]);

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
  }, []);

  // NEW) Power → Engine bridge (Bomb targeting confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUseAt = (e: Event) => {
      const ce = e as CustomEvent<PowerUseAtDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;
      if (typeof d.index !== 'number') return;

      dispatch({ type: 'useBombAt', index: d.index, nowMs: performance.now() } as EngineAction);
    };

    window.addEventListener('match3:powerUseAt', onUseAt as EventListener);
    return () => window.removeEventListener('match3:powerUseAt', onUseAt as EventListener);
  }, []);

  // derive primitives so effects don't depend on `state.anim` object reference
  const animKind = state.anim?.kind;
  const animToken = state.anim?.token;
  const animDurationMs = state.anim?.durationMs;
  const animDeadlineAtMs = state.anim?.deadlineAtMs;

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
  }, [animToken, animKind, animDurationMs]);

  // 2) Deadline fallback (single timer, no per-frame ticking)
  useEffect(() => {
    if (animToken == null) return;
    if (animDeadlineAtMs == null) return;

    const delay = Math.max(0, animDeadlineAtMs - performance.now());
    const id = window.setTimeout(() => {
      dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);
    }, delay + 5);

    return () => window.clearTimeout(id);
  }, [animToken, animDeadlineAtMs]);

  const canSwapAt = useCallback(
    (from: number, to: number) => {
      return canSwap(from, to, state.width, state.cells).ok;
    },
    [state.width, state.cells],
  );

  const onIntent = useCallback(
    (intent: unknown) => {
      const i = intent as unknown as { type?: unknown; index?: unknown; from?: unknown; to?: unknown };

      if (i?.type === 'click' && typeof i.index === 'number') {
        dispatch({ type: 'clickCell', index: i.index, nowMs: performance.now() } as EngineAction);
        return;
      }

      if (i?.type === 'swap' && typeof i.from === 'number' && typeof i.to === 'number') {
        dispatch({ type: 'swapAttempt', from: i.from, to: i.to, nowMs: performance.now() } as EngineAction);
        return;
      }

      // optional direct route (in case you later emit it via onIntent)
      if (i?.type === 'useBombAt' && typeof i.index === 'number') {
        dispatch({ type: 'useBombAt', index: i.index, nowMs: performance.now() } as EngineAction);
        return;
      }

      dispatch(intent as EngineAction);
    },
    [dispatch],
  );

  const onDevResetBoard = useCallback(() => {
    dispatch({ type: 'resetBoard', nowMs: performance.now() } as EngineAction);
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
