// src/features/devtools-host/ui/GameContainer.tsx
import type { RefObject } from 'react';
import { useCallback, useEffect, useReducer } from 'react';

import type { EngineState } from '@/gamelogic';

import { Grid } from '@/features/grid';

import { useHudInputFromState } from '@/features/devtools-host/lib/useHudInputFromState';

// 🔥 tiles are module-level state -> must force rerender when they change
import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';
import { preloadSpecialTiles, setSpecialTilesetLevel } from '@/features/grid/ui/tilesSpecial';

import { GameStage } from './GameStage';
import GameplayHud from './GameplayHud';

type Props = {
  state: EngineState;
  inputLocked: boolean;

  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: { type: 'click'; index: number } | { type: 'swap'; from: number; to: number }) => void;

  // Runtime / environment
  isDev?: boolean;
  debugEnabled?: boolean;

  // Dev-only visuals
  showLockoutHints?: boolean;
  onToggleShowLockoutHints?: () => void;

  // Dev actions
  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevNextTilesPalette?: () => void;

  // Ref injection for devtools panel sync
  gridRowRef?: RefObject<HTMLDivElement | null>;

  // Triggers re-render on tiles palette changes
  tilesVersion?: number;
};

export default function GameContainer({
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
  gridRowRef,
}: Props) {
  // Bump component render when tileset/palette changes (tiles live outside React state)
  const [, bumpTilesRender] = useReducer((n: number) => (n + 1) % 1_000_000_000, 0);

  // Sync tilesets to current level AND force rerender so sprites switch immediately
  useEffect(() => {
    setTilesetLevel(state.levelId);
    setSpecialTilesetLevel(state.levelId);

    // Preload the currently active sheets (nice-to-have, but helps avoid “late” swap feel)
    preloadTiles();
    preloadSpecialTiles();

    bumpTilesRender();
  }, [state.levelId]);

  const handleDevNextTilesPalette = useCallback(() => {
    onDevNextTilesPalette?.();

    // palette change also updates module globals -> force rerender now
    preloadTiles();
    preloadSpecialTiles();
    bumpTilesRender();
  }, [onDevNextTilesPalette]);

  // Derive HUD input from engine state
  const hudInput = useHudInputFromState(state);

  const gridElement = (
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
      onDevNextTilesPalette={handleDevNextTilesPalette}
      swapMs={state.swapMs}
    />
  );

  const hudElement = <GameplayHud {...hudInput} />;

  return <GameStage gridRowRef={gridRowRef} grid={gridElement} hud={hudElement} />;

  // Keep isDev in scope for potential future use (prevents unused-var warning)
  void isDev;
}
