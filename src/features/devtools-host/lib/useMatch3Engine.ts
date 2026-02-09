import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import type { EngineAction } from '@/gamelogic';
import { canSwap, createInitialState, engineReducer, SWAP_MS } from '@/gamelogic';

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

  // 1) UI → Engine "done" bridge (NO rAF loop)
  useEffect(() => {
    const a = state.anim;
    if (!a) return;

    const id = window.setTimeout(() => {
      const now = performance.now();

      // keep engine clock fresh so follow-up beginAnim uses correct nowMs
      dispatch({ type: 'wake', nowMs: now } as EngineAction);

      if (a.kind === 'swap') {
        dispatch({ type: 'swapAnimDone', token: a.token, nowMs: now } as EngineAction);
        return;
      }

      if (a.kind === 'swapBack') {
        dispatch({ type: 'swapBackAnimDone', token: a.token, nowMs: now } as EngineAction);
        return;
      }

      if (a.kind === 'fall') {
        dispatch({ type: 'fallAnimDone', token: a.token, nowMs: now } as EngineAction);
        return;
      }
    }, a.durationMs);

    return () => window.clearTimeout(id);
  }, [state.anim?.token, state.anim?.kind, state.anim?.durationMs]);

  // 2) Deadline fallback (single timer, no per-frame ticking)
  useEffect(() => {
    const a = state.anim;
    if (!a) return;

    const delay = Math.max(0, a.deadlineAtMs - performance.now());
    const id = window.setTimeout(() => {
      dispatch({ type: 'wake', nowMs: performance.now() } as EngineAction);
    }, delay + 5);

    return () => window.clearTimeout(id);
  }, [state.anim?.token, state.anim?.deadlineAtMs]);

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
