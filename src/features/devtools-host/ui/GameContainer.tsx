import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import type { EngineState } from '@/gamelogic';

import { Grid } from '@/features/grid';
import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';

import GameplayHud from './GameplayHud';

type Props = {
  state: EngineState;

  inputLocked: boolean;

  // Game rules injected: Grid doesn't know what is "legal".
  canSwapAt: (from: number, to: number) => boolean;

  // Grid emits only intents. Parent decides what to do with them.
  onIntent: (intent: { type: 'click'; index: number } | { type: 'swap'; from: number; to: number }) => void;

  // Runtime / environment
  isDev?: boolean;
  debugEnabled?: boolean;

  // Dev-only visuals for lockout feedback (cursor/dim/badge).
  showLockoutHints?: boolean;
  onToggleShowLockoutHints?: () => void;

  // Dev actions (optional)
  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevNextTilesPalette?: () => void;

  // Optional ref injection (devtoolsHost uses this for panel top sync)
  gridRowRef?: RefObject<HTMLDivElement | null>;

  // Used by devtoolsHost to force rerender on tiles palette changes.
  // Not used directly here, but prop changes trigger re-render.
  tilesVersion?: number;
};

export default function GameContainer(props: Props) {
  const {
    state,
    inputLocked,
    canSwapAt,
    onIntent,

    isDev = false,
    debugEnabled = false,

    showLockoutHints = false,
    onToggleShowLockoutHints,

    onDevResetBoard,
    onDevPrevLevel,
    onDevNextLevel,
    onDevNextTilesPalette,

    gridRowRef: externalGridRowRef,
  } = props;

  // allow devtoolsHost to inject the ref; otherwise fall back to an internal one
  const internalGridRowRef = useRef<HTMLDivElement | null>(null);
  const gridRowRef = externalGridRowRef ?? internalGridRowRef;

  useEffect(() => {
    setTilesetLevel(state.levelId);
    preloadTiles();
  }, [state.levelId]);

  const breachTotal = state.breachesTotal ?? 0;
  const breachLeft = state.breachesRemaining ?? 0;
  const breachDone = Math.max(0, breachTotal - breachLeft);

  const isWin = state.phase === 'win';
  const isLose = state.phase === 'lose';

  return (
    <div className="w-full">
      <GameplayHud
        levelId={state.levelId}
        gateOpen={state.gateOpen}
        breachDone={breachDone}
        breachTotal={breachTotal}
        movesLeft={state.movesLeft ?? '—'}
        isWin={isWin}
        isLose={isLose}
      />

      <div ref={gridRowRef} className="flex justify-center items-start pt-12">
        <Grid
          state={state}
          inputLocked={inputLocked}
          showLockoutHints={showLockoutHints}
          onToggleShowLockoutHints={onToggleShowLockoutHints}
          canSwapAt={canSwapAt}
          onIntent={onIntent}
          debugEnabled={debugEnabled}
          onDevResetBoard={onDevResetBoard}
          onDevPrevLevel={onDevPrevLevel}
          onDevNextLevel={onDevNextLevel}
          onDevNextTilesPalette={onDevNextTilesPalette}
          swapMs={state.swapMs}
        />
      </div>

      {/* keep props read for React rerendering on dev palette changes */}
      {isDev ? null : null}
    </div>
  );
}
