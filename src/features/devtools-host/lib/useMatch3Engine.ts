// src\features\devtools-host\lib\useMatch3Engine.ts
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import type { EngineAction } from '@/gamelogic';
import { canSwap, createInitialState, engineReducer, SWAP_MS } from '@/gamelogic';
import {
  POWER_CONSUME_EVENT,
  POWER_USE_AT_EVENT,
  POWER_USE_EVENT,
  type PowerConsumeDetail,
  type PowerUseAtDetail,
  type PowerUseDetail,
} from '@/context/powerEvents';
import type { PowerKey } from '@/types';

type Args = {
  initialLevelId?: number;
};

function isPowerKey(v: unknown): v is PowerKey {
  return v === 'bomb' || v === 'laser' || v === 'extraShuffle';
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

  // monotonic requestId allocator for power flows (prevents requestId=0 breaking consume dedupe)
  const nextPowerRequestIdRef = useRef(1);
  const allocPowerRequestId = useCallback((maybe: unknown): number => {
    if (typeof maybe === 'number' && Number.isFinite(maybe)) {
      const v = maybe | 0;
      if (v > 0) return v;
    }

    const v = nextPowerRequestIdRef.current | 0;
    nextPowerRequestIdRef.current = (v + 1) | 0;
    return Math.max(1, v);
  }, []);

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
  }, [allocPowerRequestId]);

  // Power → Engine bridge (Bomb targeting confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUseAt = (e: Event) => {
      const ce = e as CustomEvent<PowerUseAtDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;

      const t = d.target;
      if (!t || typeof t.x !== 'number' || typeof t.y !== 'number') return;

      const requestId = allocPowerRequestId(d.requestId);

      // Always route legacy/modern bomb usage through useItemAt
      dispatch({
        type: 'useItemAt',
        key: 'bomb3x3',
        target: { x: t.x | 0, y: t.y | 0 },
        requestId,
        nowMs: performance.now(),
      } as EngineAction);
    };

    window.addEventListener(POWER_USE_AT_EVENT, onUseAt as EventListener);
    return () => window.removeEventListener(POWER_USE_AT_EVENT, onUseAt as EventListener);
  }, [allocPowerRequestId]);

  // EngineEvent `powerUsed` → UI consume (ack-driven)
  const seenPowerUsedRef = useRef<SeenRing>({ set: new Set<string>(), order: [] });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seen = seenPowerUsedRef.current;

    for (const ev of state.events) {
      if (!isPowerUsedEvent(ev)) continue;

      const id = `${ev.key}:${ev.requestId}`;
      if (!markSeen(seen, id, 256)) continue;

      window.dispatchEvent(
        new CustomEvent<PowerConsumeDetail>(POWER_CONSUME_EVENT, {
          detail: { key: ev.key, amount: 1, requestId: ev.requestId },
        }),
      );
    }
  }, [state.events]);

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
      const i = intent as unknown as {
        type?: unknown;
        index?: unknown;
        from?: unknown;
        to?: unknown;
        target?: unknown;
        requestId?: unknown;
      };

      if (i?.type === 'click' && typeof i.index === 'number') {
        dispatch({ type: 'clickCell', index: i.index, nowMs: performance.now() } as EngineAction);
        return;
      }

      if (i?.type === 'swap' && typeof i.from === 'number' && typeof i.to === 'number') {
        dispatch({ type: 'swapAttempt', from: i.from, to: i.to, nowMs: performance.now() } as EngineAction);
        return;
      }

      // Legacy route: convert useBombAt intents to useItemAt (prevents reducer crash)
      if (i?.type === 'useBombAt') {
        const t = i.target as { x?: unknown; y?: unknown } | undefined;
        if (t && typeof t.x === 'number' && typeof t.y === 'number') {
          const requestId = allocPowerRequestId(i.requestId);

          dispatch({
            type: 'useItemAt',
            key: 'bomb3x3',
            target: { x: t.x | 0, y: t.y | 0 },
            requestId,
            nowMs: performance.now(),
          } as EngineAction);
          return;
        }
      }

      dispatch(intent as EngineAction);
    },
    [allocPowerRequestId, dispatch],
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
