import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { EngineAction, EngineEvent } from '@/gamelogic';
import { canSwap, createInitialState, engineReducer } from '@/gamelogic';

import { DebugEventLog } from '@/devtools';
import { Grid } from '@/features/grid';
import { SWAP_MS } from '@/features/grid/lib/constants';

type Props = {
  initialLevelId?: number;
};

export default function GameContainer({ initialLevelId = 1 }: Props) {
  const isDev = import.meta.env.DEV;

  const [levelId, setLevelId] = useState<number>(initialLevelId);
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(true);

  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);

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

  // ensure level change actually re-inits engine (skip first run)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    dispatch({ type: 'initLevel', levelId } as EngineAction);
  }, [levelId]);

  const inputLocked = useMemo(() => {
    const anyState = state as unknown as { inputLocked?: boolean; phase?: string };
    if (typeof anyState.inputLocked === 'boolean') return anyState.inputLocked;
    if (typeof anyState.phase === 'string') return anyState.phase !== 'idle';
    return false;
  }, [state]);

    // drive engine runtime steps after CSS swap animations finish
  useEffect(() => {
    if (state.phase === 'swapAnimating') {
      const t = window.setTimeout(() => dispatch({ type: 'swapAnimDone' } as EngineAction), SWAP_MS);
      return () => window.clearTimeout(t);
    }

    if (state.phase === 'swapBackAnimating') {
      const t = window.setTimeout(() => dispatch({ type: 'swapBackAnimDone' } as EngineAction), SWAP_MS);
      return () => window.clearTimeout(t);
    }

    return;
  }, [state.phase]);
const canSwapAt = (from: number, to: number) => {
    return canSwap(from, to, state.width, state.cells).ok;
  };

  const onIntent = (intent: unknown) => {
    const i = intent as unknown as { type?: unknown; index?: unknown; from?: unknown; to?: unknown };

    if (i?.type === 'click' && typeof i.index === 'number') {
      dispatch({ type: 'clickCell', index: i.index } as EngineAction);
      return;
    }

    if (i?.type === 'swap' && typeof i.from === 'number' && typeof i.to === 'number') {
      dispatch({ type: 'swapAttempt', from: i.from, to: i.to } as EngineAction);
      return;
    }

    dispatch(intent as EngineAction);
  };

  const onDevResetBoard = () => {
    dispatch({ type: 'resetBoard' } as EngineAction);
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

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-lg font-semibold text-white/90">Level {state.levelId ?? levelId}</div>
          <div className="text-sm text-white/70">
            Board: {state.width}x{state.height} Seed: <span className="font-mono">{state.seed ?? '—'}</span>
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
        />
      </div>
    </div>
  );
}

