// src/features/playground/ui/GameContainer.tsx
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { EngineAction, EngineEvent } from '@/gamelogic';
import { canSwap, createInitialState, engineReducer, SWAP_MS } from '@/gamelogic';

import { DebugEventLog } from '@/devtools';
import { Grid } from '@/features/grid';

type Props = {
  initialLevelId?: number;
};

export default function GameContainer({ initialLevelId = 1 }: Props) {
  const isDev = import.meta.env.DEV;

  const [levelId, setLevelId] = useState<number>(initialLevelId);
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(false);

  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);

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

  useEffect(() => {
    if (!isDev) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;

      if (isTyping) return;

      if (e.key === 'd' || e.key === 'D') {
        setDebugEnabled((v) => !v);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDev]);

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

  const inputLocked = state.inputLocked;

  const breachTotal = state.breachesTotal ?? 0;
  const breachLeft = state.breachesRemaining ?? 0;
  const breachDone = Math.max(0, breachTotal - breachLeft);

  const isWin = state.phase === 'win';
  const isLose = state.phase === 'lose';

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
  const canSwapAt = (from: number, to: number) => {
    return canSwap(from, to, state.width, state.cells).ok;
  };

  const onIntent = (intent: unknown) => {
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
  };

  const onDevResetBoard = () => {
    dispatch({ type: 'resetBoard', nowMs: performance.now() } as EngineAction);
  };

  const events = useMemo<EngineEvent[]>(() => {
    const anyState = state as unknown as { events?: EngineEvent[] };
    return anyState.events ?? [];
  }, [state]);

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!isDev || !debugEnabled) return;

    const stage = document.getElementById('app-stage');
    const row = gridRowRef.current;
    if (!stage || !row) return;

    const stageRect = stage.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();

    const top = Math.max(0, rowRect.top - stageRect.top);
    document.documentElement.style.setProperty('--dev-panels-top', `${top}px`);

    return () => {
      document.documentElement.style.removeProperty('--dev-panels-top');
    };
  }, [isDev, debugEnabled, state.levelId, state.width, state.height, showLockoutHints]);

  const rightLane = typeof document !== 'undefined' ? (document.getElementById('dev-right-lane') as HTMLElement | null) : null;

  const eventLogPortal =
    isDev && debugEnabled && rightLane
      ? createPortal(
          <div className="min-w-[320px] max-w-[520px] w-full">
            <DebugEventLog events={events} />
          </div>,
          rightLane,
        )
      : null;

  return (
    <div className="w-full">
      {eventLogPortal}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <div className="text-2xl font-semibold text-white/90 tabular-nums">120</div>
          <div className="text-xs tracking-widest text-white/60 uppercase">Time</div>
        </div>

        <div className="flex-1 rounded-2xl border border-fuchsia-400/20 bg-black/55 backdrop-blur px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.50)]">
          <div className="text-xs tracking-widest text-fuchsia-200/80 uppercase">Objective</div>
          <div className="mt-0.5 text-base font-semibold text-white/90">Collect 20 Red</div>
        </div>

        <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <div className="text-2xl font-semibold text-white/90 tabular-nums">{state.movesLeft ?? '—'}</div>
          <div className="text-xs tracking-widest text-white/60 uppercase">Moves</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-lg font-semibold text-white/90">Level {state.levelId ?? levelId}</div>
          <div className="text-sm text-white/70">
            Board: {state.width}x{state.height} Seed: <span className="font-mono">{state.seed ?? '—'}</span>
          </div>

          <div className="mt-1 text-sm text-white/80 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="font-mono">BREACH {breachDone}/{breachTotal}</div>
            <div className="text-white/60">Matches neben einem Knoten beschädigen ihn.</div>
            {isWin ? <div className="text-emerald-300/90 font-semibold">WIN — Gate open</div> : null}
            {isLose ? <div className="text-rose-300/90 font-semibold">LOSE — out of moves</div> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDev ? (
            <div className="text-xs text-white/50 px-2 py-1 rounded-md border border-white/10 bg-black/20">Debug: {debugEnabled ? 'on' : 'off'} (press D)</div>
          ) : null}

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
            onClick={() => setShowLockoutHints((v) => !v)}
          >
            Lockout hints: {showLockoutHints ? 'on' : 'off'}
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
            onClick={() => setLevelId((v) => v + 1)}
          >
            Next level
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
            onClick={() => setLevelId((v) => Math.max(1, v - 1))}
          >
            Prev level
          </button>
        </div>
      </div>

      <div ref={gridRowRef} className="flex justify-center items-start">
        <Grid
          state={state}
          inputLocked={inputLocked}
          showLockoutHints={showLockoutHints}
          onToggleShowLockoutHints={() => setShowLockoutHints((v) => !v)}
          canSwapAt={canSwapAt}
          onIntent={onIntent}
          debugEnabled={debugEnabled}
          onDevResetBoard={onDevResetBoard}
          swapMs={state.swapMs}
        />
      </div>
    </div>
  );
}




