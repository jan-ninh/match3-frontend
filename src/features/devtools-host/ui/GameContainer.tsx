// src/features/devtools-host/ui/GameContainer.tsx
import type { RefObject } from 'react';

import type { EngineState } from '@/gamelogic';

import { Grid } from '@/features/grid';

import { useHudInputFromState } from '@/features/grid/lib/useHudInputFromState';
import { useTilesetSync } from '@/features/grid/lib/useTilesetSync';

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
  // Sync tileset to current level
  useTilesetSync(state.levelId);

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
      onDevNextTilesPalette={onDevNextTilesPalette}
      swapMs={state.swapMs}
    />
  );

  const hudElement = <GameplayHud {...hudInput} />;

  return <GameStage gridRowRef={gridRowRef} grid={gridElement} hud={hudElement} />;

  // Keep isDev in scope for potential future use (prevents unused-var warning)
  void isDev;
}
