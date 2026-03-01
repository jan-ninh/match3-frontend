// src/features/devtools-host/ui/DevtoolsScene.tsx
import { useCallback, useEffect, useRef } from 'react';

import type { EngineState } from '@/gamelogic';

import { resetProgress } from '@/services/progress/progressActions';
import { useAuth } from '@/context/AuthContext';
import { useGameplayRuntime } from '@/features/gameplay/ui/GameplayRoot';

import { useDevOverlayState } from '../lib/devtools/useDevOverlayState';
import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { usePossibleMatchSwaps } from '../lib/match/usePossibleMatchSwaps';
import { useTilesetPaletteCycle } from '../lib/tiles/useTilesetPaletteCycle';

import DevPanels from './DevPanels';
import GameContainer from './GameContainer';

function clearDevPanelsTopVar() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.removeProperty('--dev-panels-top');
}

export default function DevtoolsScene() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const {
    isDev,
    state,
    inputLocked,
    canSwapAt,
    onIntent,
    onDevResetBoard,
    onDevFixedSeed,
    onDevNextLevel,
    onDevPrevLevel,
    onDevSetLevel,
    onDevWin,
    onDevLose,
  } = useGameplayRuntime();

  const { debugEnabled, showMatches, showLockoutHints, onToggleShowMatches, onToggleShowLockoutHints } = useDevOverlayState({ isDev });

  const matchSwaps = usePossibleMatchSwaps({
    enabled: isDev && debugEnabled,
    state: state as EngineState,
  });

  const { tilesVersion, onDevNextTilesPalette } = useTilesetPaletteCycle();

  // Level 05+: dev panels need a stable ref to the grid row wrapper for top-offset sync.
  const gridRowRef = useRef<HTMLDivElement | null>(null);

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  const onDevResetProgress = useCallback(async () => {
    // Guest mode only.
    if (!userId) {
      await resetProgress();
    }
  }, [userId]);

  // Defensive: when leaving dev overlay, reset the top-offset CSS var.
  useEffect(() => {
    if (isDev && debugEnabled) return;
    clearDevPanelsTopVar();
  }, [isDev, debugEnabled]);

  return (
    <div className="w-full h-full">
      <DevPanels
        enabled={isDev && debugEnabled}
        events={state.events}
        onDevWin={onDevWin}
        onDevLose={onDevLose}
        onDevResetProgress={onDevResetProgress}
        onDevFixedSeed={onDevFixedSeed}
      />

      <GameContainer
        state={state}
        inputLocked={inputLocked}
        canSwapAt={canSwapAt}
        onIntent={onIntent}
        isDev={isDev}
        debugEnabled={debugEnabled}
        showLockoutHints={showLockoutHints}
        showMatches={showMatches}
        matchSwaps={matchSwaps}
        onToggleShowMatches={onToggleShowMatches}
        onToggleShowLockoutHints={onToggleShowLockoutHints}
        onDevResetBoard={onDevResetBoard}
        onDevPrevLevel={onDevPrevLevel}
        onDevNextLevel={onDevNextLevel}
        onDevSetLevel={onDevSetLevel}
        onDevNextTilesPalette={onDevNextTilesPalette}
        onTimeExpired={onDevLose}
        gridRowRef={gridRowRef}
        tilesVersion={tilesVersion}
      />
    </div>
  );
}
