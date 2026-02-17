// src/features/devtools-host/ui/GameContainer.tsx
import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { EngineState } from '@/gamelogic';
import { useCoreSfxWarmup, useEngineMatchObjectiveSfx } from '@/features/audio';
import { Grid, type InputIntent } from '@/features/grid';
import { useGridInput } from '@/features/grid/input/useGridInput';
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

  // Grid input / VM wiring (SSOT: useGridInput)
  const gridInput = useGridInput({
    state,
    inputLocked,
    canSwapAt,
    onIntent,
    debugEnabled,
    swapMs: state.swapMs,
  });

  const vm = useMemo(
    () => ({
      cells: state.cells,
      pieceList: gridInput.pieceList,
      selectionPos: null,
      targetPos: null,

      dragPieceId: gridInput.dragPieceId,
      isDragging: gridInput.isDragging,

      previewActive: gridInput.previewActive,
      previewOtherPieceId: gridInput.previewOtherPieceId,
      previewAxisUI: gridInput.previewAxisUI,
      previewDirUI: gridInput.previewDirUI,

      shakePieceId: gridInput.shakePieceId,
      setDraggedEl: gridInput.setDraggedEl,
    }),
    [
      state.cells,
      gridInput.pieceList,
      gridInput.dragPieceId,
      gridInput.isDragging,
      gridInput.previewActive,
      gridInput.previewOtherPieceId,
      gridInput.previewAxisUI,
      gridInput.previewDirUI,
      gridInput.shakePieceId,
      gridInput.setDraggedEl,
    ],
  );

  // NOTE: innerW/innerH are still passed by the runtime container in this codebase.
  // Until we measure the actual inner size, fall back to a stable, non-crashing value.
  const innerW = state.width;
  const innerH = state.height;

  const gridElement = (
    <Grid
      state={state}
      width={state.width}
      height={state.height}
      swapMs={state.swapMs}
      debugEnabled={debugEnabled}
      bombVfxMode={'legacyShock' satisfies BombVfxMode}
      vm={vm}
      inputLocked={inputLocked}
      showLockoutHints={showLockoutHints}
      showDebugLabels={debugEnabled}
      innerW={innerW}
      innerH={innerH}
      onPointerMove={gridInput.onPointerMove}
      onPointerUp={gridInput.onPointerUp}
      onPointerCancel={gridInput.onPointerCancel}
      onCellPointerDown={gridInput.onCellPointerDown}
      onShellPointerMove={gridInput.onPointerMove}
      onShellPointerLeave={noop}
      debugSnapshot={gridInput.debugSnapshot}
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
