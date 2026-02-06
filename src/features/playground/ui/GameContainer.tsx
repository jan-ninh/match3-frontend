// src/features/playground/ui/GameContainer.tsx
import { useEffect, useRef, useState } from 'react';

import { Grid } from '@/features/grid';
import { cycleTilesetPalette, setTilesetLevel, preloadTiles } from '@/features/grid/ui/tiles';

import { useDevHotkeys } from '../lib/useDevHotkeys';
import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { useMatch3Engine } from '../lib/useMatch3Engine';
import DevPanels from './DevPanels';
import GameplayHud from './GameplayHud';

type Props = {
  initialLevelId?: number;
};

export default function GameContainer({ initialLevelId = 1 }: Props) {
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(false);
  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevNextLevel, onDevPrevLevel, events } = useMatch3Engine({ initialLevelId });
  const [, bumpTilesRerender] = useState(0);

  const onDevNextTilesPalette = () => {
    cycleTilesetPalette();
    preloadTiles();
    bumpTilesRerender((v) => (v + 1) | 0);
  };

  useEffect(() => {
    setTilesetLevel(state.levelId);
    preloadTiles();
  }, [state.levelId]);

  useDevHotkeys({
    enabled: isDev,
    onToggle: () => setDebugEnabled((v) => !v),
  });

  const breachTotal = state.breachesTotal ?? 0;
  const breachLeft = state.breachesRemaining ?? 0;
  const breachDone = Math.max(0, breachTotal - breachLeft);

  const isWin = state.phase === 'win';
  const isLose = state.phase === 'lose';

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  return (
    <div className="w-full">
      <DevPanels enabled={isDev && debugEnabled} events={events} />

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
          onToggleShowLockoutHints={() => setShowLockoutHints((v) => !v)}
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
    </div>
  );
}
