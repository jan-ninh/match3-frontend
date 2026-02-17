import type { RefObject } from 'react';
import { useCallback, useEffect, useReducer } from 'react';
import type { EngineState } from '@/gamelogic';
import { useCoreSfxWarmup, useEngineMatchObjectiveSfx } from '@/features/audio';
import { Grid, type InputIntent } from '@/features/grid';
import { useHudInputFromState } from '@/features/devtools-host/lib/useHudInputFromState';
// 🔥 tiles are module-level state -> must force rerender when they change
import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';
import { preloadSpecialTiles, setSpecialTilesetLevel } from '@/features/grid/ui/tilesSpecial';

import type { BombVfxMode } from '@/features/grid/ui/bomb/fx/BombExplosionFxLayer';

import { GameStage } from './GameStage';
import GameplayHud from './GameplayHud';

type Props = {
  state: EngineState;
  inputLocked: boolean;

  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;

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

const noop = () => undefined;

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
  // Audio warmup + engine-event→SFX mapping
  useCoreSfxWarmup();
  useEngineMatchObjectiveSfx(state);

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
      canSwapAt={canSwapAt}
      onIntent={onIntent}
      debugEnabled={debugEnabled}
      swapMs={state.swapMs}
      bombVfxMode={'legacyShock' satisfies BombVfxMode}
      showLockoutHints={showLockoutHints}
      showDebugLabels={debugEnabled}
      onToggleShowLockoutHints={onToggleShowLockoutHints ?? noop}
      onDevPrevLevel={onDevPrevLevel ?? noop}
      onDevNextLevel={onDevNextLevel ?? noop}
      onDevResetBoard={onDevResetBoard ?? noop}
      onDevNextTilesPalette={handleDevNextTilesPalette}
    />
  );

  const hudElement = <GameplayHud {...hudInput} />;

  return <GameStage gridRowRef={gridRowRef} grid={gridElement} hud={hudElement} />;

  // Keep isDev in scope for potential future use (prevents unused-var warning)
  void isDev;
}
