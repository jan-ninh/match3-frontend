// src/features/grid/ui/Grid.tsx
import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { EngineState } from '@/gamelogic/types';

import { GridShell } from './GridShell';
import GridOverlaysLayer from './GridOverlaysLayer';
import GridPiecesLayer from './GridPiecesLayer';
import GridCellsLayer from './GridCellsLayer';
import { GridDevPanels } from './GridDevPanels';

import { LaserWarningOverlay } from './LaserWarningOverlay';

import { BombExplosionFxLayer } from './bomb/fx/BombExplosionFxLayer';
import { BombOverlay } from './bomb/BombOverlay';
import type { BombVfxMode } from './bomb/fx/BombExplosionFxLayer';
import { useBomb3x3Targeting } from './bomb/useBomb3x3Targeting';

import { LaserRowOverlay } from './laser/LaserRowOverlay';
import { useLaserRowTargeting } from './laser/useLaserRowTargeting';

type GridInputViewModel = Readonly<{
  cells: ComponentProps<typeof GridCellsLayer>['cells'];
  pieceList: ComponentProps<typeof GridPiecesLayer>['pieces'];
  selectionPos: ComponentProps<typeof GridOverlaysLayer>['selectionPos'];
  targetPos: ComponentProps<typeof GridOverlaysLayer>['targetPos'];

  dragPieceId: ComponentProps<typeof GridPiecesLayer>['dragPieceId'];
  isDragging: ComponentProps<typeof GridPiecesLayer>['isDragging'];

  previewActive: ComponentProps<typeof GridPiecesLayer>['previewActive'];
  previewOtherPieceId: ComponentProps<typeof GridPiecesLayer>['previewOtherPieceId'];
  previewAxisUI: ComponentProps<typeof GridPiecesLayer>['previewAxis'];
  previewDirUI: ComponentProps<typeof GridPiecesLayer>['previewDir'];

  shakePieceId: ComponentProps<typeof GridPiecesLayer>['shakePieceId'];
  setDraggedEl: ComponentProps<typeof GridPiecesLayer>['setDraggedEl'];
}>;

export type GridUIProps = {
  state: EngineState;
  width: number;
  height: number;
  swapMs: number;
  debugEnabled: boolean;
  bombVfxMode: BombVfxMode;

  // SSOT for input visuals (drag/hover/selection, etc.)
  vm: GridInputViewModel;

  // derived
  inputLocked: boolean;
  showLockoutHints: boolean;
  showDebugLabels: boolean;
  innerW: number;
  innerH: number;

  // handlers
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCellPointerDown: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  onShellPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onShellPointerLeave: () => void;

  // dev
  debugSnapshot: ComponentProps<typeof GridDevPanels>['debugSnapshot'];
  onToggleShowLockoutHints: () => void;
  onDevPrevLevel: () => void;
  onDevNextLevel: () => void;
  onDevResetBoard: () => void;
  onDevNextTilesPalette: () => void;
};

type CssVars = React.CSSProperties & Record<`--${string}`, string | number>;

/**
 * GridView = reine Darstellung + lokale Targeting/UI-Orchestrierung.
 * Kein Input-Wiring (vm + debugSnapshot kommen von Feature-Wrapper).
 */
export function GridView({
  state,
  width,
  height,
  swapMs,
  debugEnabled,
  bombVfxMode,
  vm,
  inputLocked,
  showLockoutHints,
  showDebugLabels,
  innerW,
  innerH,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onCellPointerDown,
  onShellPointerMove,
  onShellPointerLeave,
  debugSnapshot,
  onToggleShowLockoutHints,
  onDevPrevLevel,
  onDevNextLevel,
  onDevResetBoard,
  onDevNextTilesPalette,
}: GridUIProps) {
  const {
    cells,
    pieceList,
    selectionPos,
    targetPos,
    dragPieceId,
    isDragging,
    previewActive,
    previewOtherPieceId,
    previewAxisUI,
    previewDirUI,
    shakePieceId,
    setDraggedEl,
  } = vm;

  const bomb = useBomb3x3Targeting({ width, height, swapMs, inputLocked });
  const laser = useLaserRowTargeting({ width, height, inputLocked });

  const effectiveInputLocked = inputLocked || bomb.bombArmed || laser.laserArmed;
  const capturePointerMove = bomb.bombArmed || laser.laserArmed;

  const cursorClass = useMemo(() => {
    if (effectiveInputLocked && showLockoutHints) return 'cursor-not-allowed';
    if (bomb.bombArmed || laser.laserArmed) return 'cursor-crosshair';
    if (isDragging) return 'cursor-grabbing';
    return 'cursor-grab';
  }, [bomb.bombArmed, effectiveInputLocked, isDragging, laser.laserArmed, showLockoutHints]);

  const shellStyle = useMemo<CssVars>(() => ({ '--boardDim': 0.35 }), []);

  const onShellPointerMoveEffective = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed) {
      bomb.onShellPointerMove(e);
      return;
    }
    if (laser.laserArmed) {
      laser.onShellPointerMove(e);
      return;
    }
    onShellPointerMove(e);
  };

  const onShellPointerLeaveEffective = () => {
    if (bomb.bombArmed) bomb.onShellPointerLeave();
    if (laser.laserArmed) laser.onShellPointerLeave();
    onShellPointerLeave();
  };

  const onPointerUpEffective = (e: React.PointerEvent<HTMLDivElement>) => {
    // IMPORTANT:
    // While targeting (bomb/laser), we block normal pointer-move / cell-down to prevent swaps,
    // but we MUST still forward pointer-up / pointer-cancel so the input controller can release
    // the current pointer sequence (otherwise the grid can get stuck).
    onPointerUp(e);
  };

  const onPointerCancelEffective = (e: React.PointerEvent<HTMLDivElement>) => {
    // See note in onPointerUpEffective.
    onPointerCancel(e);
  };

  const onCellPointerDownEffective = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (bomb.bombArmed) {
      bomb.onCellPointerDown(index, e);
      return;
    }
    if (laser.laserArmed) {
      laser.onCellPointerDown(index, e);
      return;
    }
    onCellPointerDown(index, e);
  };

  // Single pointer-move hook point:
  // - targeting armed => route to targeting (bomb/laser) via shell-move
  // - normal => forward to BOTH controller move + shell move
  const onPointerMoveMerged = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed || laser.laserArmed) {
      onShellPointerMoveEffective(e);
      return;
    }
    onPointerMove(e);
    onShellPointerMove(e);
  };

  const isDev = import.meta.env.DEV;
  const bombFxMode: BombVfxMode = import.meta.env.DEV && isDev && debugEnabled ? bombVfxMode : 'legacyShock';

  return (
    <>
      <GridDevPanels
        enabled={isDev && debugEnabled}
        width={width}
        inputLocked={inputLocked}
        showLockoutHints={showLockoutHints}
        onToggleShowLockoutHints={onToggleShowLockoutHints}
        onDevPrevLevel={onDevPrevLevel}
        onDevNextLevel={onDevNextLevel}
        onDevResetBoard={onDevResetBoard}
        onDevNextTilesPalette={onDevNextTilesPalette}
        debugSnapshot={debugSnapshot}
        stateMeta={{ levelId: state.levelId, width, height, seed: state.seed }}
      />

      <GridShell
        shellStyle={shellStyle}
        cursorClass={cursorClass}
        inputLocked={inputLocked}
        showLockoutHints={showLockoutHints}
        innerW={innerW}
        innerH={innerH}
        boardRef={bomb.boardRef}
        capturePointerMove={capturePointerMove}
        onPointerMove={onPointerMoveMerged}
        onPointerUp={onPointerUpEffective}
        onPointerCancel={onPointerCancelEffective}
        onPointerLeave={onShellPointerLeaveEffective}
      >
        {/* Laser Warning highlight (under cells/pieces, above bg) */}
        <LaserWarningOverlay warning={state.laserWarning} innerW={innerW} innerH={innerH} />

        {/* DEV label for VFX toggle */}
        {import.meta.env.DEV && isDev && debugEnabled ? (
          <div className="absolute left-2 top-2 z-200 pointer-events-none select-none text-[10px] text-white/70">
            BombVFX: {bombFxMode === 'flipbook' ? 'Flipbook' : 'LegacyShock'} (press V)
          </div>
        ) : null}

        {/* Bomb Targeting 3×3 (square corners, red glow) */}
        <BombOverlay indices={bomb.bombOverlayIndices} width={width} zIndex={44} />

        {/* Laser Targeting (row highlight) */}
        <LaserRowOverlay armed={laser.laserArmed} row={laser.hoverRow} height={height} zIndex={46} />

        <GridCellsLayer width={width} height={height} cells={cells} onCellPointerDown={onCellPointerDownEffective} showDebugLabels={showDebugLabels} />

        <GridOverlaysLayer selectionPos={selectionPos} targetPos={targetPos} />

        <GridPiecesLayer
          width={width}
          pieces={pieceList}
          dragPieceId={dragPieceId}
          isDragging={isDragging}
          phase={state.phase}
          swapMs={swapMs}
          previewActive={previewActive}
          previewOtherPieceId={previewOtherPieceId}
          previewAxis={previewAxisUI}
          previewDir={previewDirUI}
          shakePieceId={shakePieceId}
          showDebugLabels={showDebugLabels}
          setDraggedEl={setDraggedEl}
        />

        {/* Bomb detonation FX (after ACK) */}
        <BombExplosionFxLayer bursts={bomb.bombBursts} width={width} reducedMotionHint={swapMs === 0} zIndex={88} mode={bombFxMode} />
      </GridShell>
    </>
  );
}

/**
 * @deprecated Transitional alias.
 * Import the feature wrapper (`@/features/grid`) for game usage, or `GridView` for rare view-only usage.
 */
export const Grid = GridView;
