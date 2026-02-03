import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { EngineAction, EngineEvent } from '@/gamelogic';
import { canSwap, createInitialState, engineReducer } from '@/gamelogic';
import { DebugEventLog } from '@/devtools';
import { Grid } from '@/features/grid';
import { preloadTiles } from '@/features/grid/ui/tiles';

type Props = {
  initialLevelId?: number;
};

export default function GameContainer({ initialLevelId = 1 }: Props) {
  const isDev = import.meta.env.DEV;

  const [levelId, setLevelId] = useState<number>(initialLevelId);
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(true);

  useEffect(() => {
    preloadTiles();
  }, []);

  // IMPORTANT: useReducer overload with initializerArg expects 2 type params: <R, I>
  // R = Reducer<EngineState, EngineAction>, I = number (levelId)
  const [state, dispatch] = useReducer(engineReducer, levelId, createInitialState);

  const inputLocked = useMemo(() => {
    // keep this tolerant — different engine versions name this slightly differently
    const anyState = state as unknown as { inputLocked?: boolean; phase?: string };
    if (typeof anyState.inputLocked === 'boolean') return anyState.inputLocked;
    if (typeof anyState.phase === 'string') return anyState.phase !== 'idle';
    return false;
  }, [state]);

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

    // fallback (keep build-safe)
    dispatch(intent as EngineAction);
  };

  const events = useMemo<EngineEvent[]>(() => {
    const anyState = state as unknown as { events?: EngineEvent[] };
    return anyState.events ?? [];
  }, [state]);

  // Anchor: this is the row where the grid starts.
  const gridRowRef = useRef<HTMLDivElement | null>(null);

  // Keep side lanes vertically aligned with the grid row (not with the stage top).
  useLayoutEffect(() => {
    if (!isDev) return;

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
  }, [isDev, state.levelId, state.width, state.height, showLockoutHints]);

  const rightLane = typeof document !== 'undefined' ? (document.getElementById('dev-right-lane') as HTMLElement | null) : null;

  const eventLogPortal =
    isDev && rightLane
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

      {/* Grid centered inside the stage */}
      <div ref={gridRowRef} className="flex justify-center items-start">
        <Grid
          state={state}
          inputLocked={inputLocked}
          showLockoutHints={showLockoutHints}
          onToggleShowLockoutHints={() => setShowLockoutHints((v) => !v)}
          canSwapAt={canSwapAt}
          onIntent={onIntent}
        />
      </div>
    </div>
  );
}
