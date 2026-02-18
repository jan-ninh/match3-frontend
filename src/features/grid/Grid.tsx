// src/features/grid/Grid.tsx
import type { ComponentProps } from 'react';
import { useMemo } from 'react';

import type { EngineState } from '@/gamelogic';

import type { InputIntent } from './input/typesInput';
import { useGridInput } from './input/useGridInput';

import type { BombVfxMode } from './ui/bomb/fx/BombExplosionFxLayer';
import { GridView } from './ui/Grid';
import { boardInnerSizePx, cellPixelXY } from './lib/math';

export type GridProps = {
  state: EngineState;
  inputLocked: boolean;

  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;

  // Runtime / environment
  debugEnabled?: boolean;
  showLockoutHints?: boolean;
  showDebugLabels?: boolean;

  // animation timing
  swapMs?: number;

  // visuals
  bombVfxMode?: BombVfxMode;

  // dev hooks
  onToggleShowLockoutHints?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevResetBoard?: () => void;
  onDevNextTilesPalette?: () => void;
};

/**
 * Feature wrapper:
 * - owns input wiring (useGridInput)
 * - builds the `vm` for GridView
 * - passes debugSnapshot + dev handlers
 */
export function Grid({
  state,
  inputLocked,
  canSwapAt,
  onIntent,
  debugEnabled = false,
  showLockoutHints = false,
  showDebugLabels,
  swapMs,
  bombVfxMode = 'legacyShock',
  onToggleShowLockoutHints,
  onDevPrevLevel,
  onDevNextLevel,
  onDevResetBoard,
  onDevNextTilesPalette,
}: GridProps) {
  const width = state.width;
  const height = state.height;

  const swapMsEffective = swapMs ?? state.swapMs;

  const input = useGridInput({
    state,
    inputLocked,
    canSwapAt,
    onIntent,
    debugEnabled,
    swapMs: swapMsEffective,
  });

  type Vm = ComponentProps<typeof GridView>['vm'];

  const vm: Vm = useMemo(
    () => ({
      // Rendering data
      cells: state.cells,
      pieceList: input.pieceList,

      // Overlays — convert cell index → pixel position for GridOverlaysLayer
      selectionPos: state.selectedIndex != null ? cellPixelXY(state.selectedIndex, width) : null,
      targetPos: input.overIndexUI != null ? cellPixelXY(input.overIndexUI, width) : null,

      // Dragging
      dragPieceId: input.dragPieceId,
      isDragging: input.isDragging,

      // Preview displacement
      previewActive: input.previewActive,
      previewOtherPieceId: input.previewOtherPieceId,
      previewAxisUI: input.previewAxisUI,
      previewDirUI: input.previewDirUI,

      // Feedback
      shakePieceId: input.shakePieceId,
      setDraggedEl: input.setDraggedEl,
    }),
    [
      state.cells,
      state.selectedIndex,
      width,
      input.pieceList,
      input.overIndexUI,
      input.dragPieceId,
      input.isDragging,
      input.previewActive,
      input.previewOtherPieceId,
      input.previewAxisUI,
      input.previewDirUI,
      input.shakePieceId,
      input.setDraggedEl,
    ],
  );

  // IMPORTANT:
  // `innerW/innerH` must match the real rendered board content size.
  // If we overshoot (e.g. "CELL_PX_GUESS"), the grid content (cells/pieces) will sit top-left
  // inside a larger board container → looks "off-center" even though transforms are correct.
  const { w: innerW, h: innerH } = boardInnerSizePx(width, height);

  const debugLabels = showDebugLabels ?? debugEnabled;

  return (
    <GridView
      state={state}
      width={width}
      height={height}
      swapMs={swapMsEffective}
      debugEnabled={debugEnabled}
      bombVfxMode={bombVfxMode}
      vm={vm}
      inputLocked={inputLocked}
      showLockoutHints={showLockoutHints}
      showDebugLabels={debugLabels}
      innerW={innerW}
      innerH={innerH}
      onPointerMove={input.onPointerMove}
      onPointerUp={input.onPointerUp}
      onPointerCancel={input.onPointerCancel}
      onCellPointerDown={input.onCellPointerDown}
      onShellPointerMove={input.onPointerMove}
      onShellPointerLeave={input.onShellPointerLeave}
      debugSnapshot={input.debugSnapshot}
      onToggleShowLockoutHints={onToggleShowLockoutHints ?? (() => {})}
      onDevPrevLevel={onDevPrevLevel ?? (() => {})}
      onDevNextLevel={onDevNextLevel ?? (() => {})}
      onDevResetBoard={onDevResetBoard ?? (() => {})}
      onDevNextTilesPalette={onDevNextTilesPalette ?? (() => {})}
    />
  );
}
