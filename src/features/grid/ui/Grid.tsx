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
  // NOTE: runtime wiring can still pass undefined; Grid must not hard-crash.
  vm: GridInputViewModel | undefined;

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
  debugSnapshot: unknown;
  onToggleShowLockoutHints: () => void;
  onDevPrevLevel: () => void;
  onDevNextLevel: () => void;
  onDevResetBoard: () => void;
  onDevNextTilesPalette: () => void;
};

export function Grid({
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
  const vmMissing = vm == null;

  const bomb = useBomb3x3Targeting({ width, height, swapMs, inputLocked });
  const laser = useLaserRowTargeting({ width, height, inputLocked });

  const effectiveInputLocked = inputLocked || bomb.bombArmed || laser.laserArmed;

  const isDragging = vm?.isDragging ?? false;

  const cursorClass = useMemo(() => {
    if (effectiveInputLocked && showLockoutHints) return 'cursor-not-allowed';
    if (bomb.bombArmed || laser.laserArmed) return 'cursor-crosshair';
    if (isDragging) return 'cursor-grabbing';
    return 'cursor-grab';
  }, [bomb.bombArmed, effectiveInputLocked, isDragging, laser.laserArmed, showLockoutHints]);

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

  const onPointerMoveEffective = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed || laser.laserArmed) return;
    onPointerMove(e);
  };

  const onPointerUpEffective = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed || laser.laserArmed) return;
    onPointerUp(e);
  };

  const onPointerCancelEffective = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed || laser.laserArmed) return;
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

  const isDev = import.meta.env.DEV;
  const showVmMissingBanner = vmMissing && (import.meta.env.DEV || debugEnabled);

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
        boardRef={bomb.boardRef}
        width={width}
        height={height}
        cursorClass={cursorClass}
        showDebugLabels={showDebugLabels}
        onShellPointerMove={onShellPointerMoveEffective}
        onShellPointerLeave={onShellPointerLeaveEffective}
      >
        {/* Laser Warning highlight (under cells/pieces, above bg) */}
        <LaserWarningOverlay warning={state.laserWarning} innerW={innerW} innerH={innerH} />

        {showVmMissingBanner ? (
          <div className="absolute inset-0 z-200 flex items-center justify-center pointer-events-none">
            <div className="rounded-xl bg-black/75 px-4 py-3 text-center">
              <div className="text-sm font-semibold text-red-300">Grid wiring error</div>
              <div className="mt-1 text-[11px] text-white/70">
                prop <span className="font-mono">vm</span> is missing. Check <span className="font-mono">GameContainer</span> /{' '}
                <span className="font-mono">useGridInput</span> wiring.
              </div>
            </div>
          </div>
        ) : null}

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

        {vmMissing ? null : (
          <>
            <GridCellsLayer width={width} height={height} cells={vm.cells} onCellPointerDown={onCellPointerDownEffective} showDebugLabels={showDebugLabels} />

            <GridOverlaysLayer selectionPos={vm.selectionPos} targetPos={vm.targetPos} />

            <GridPiecesLayer
              width={width}
              pieces={vm.pieceList}
              dragPieceId={vm.dragPieceId}
              isDragging={vm.isDragging}
              phase={state.phase}
              swapMs={swapMs}
              previewActive={vm.previewActive}
              previewOtherPieceId={vm.previewOtherPieceId}
              previewAxis={vm.previewAxisUI}
              previewDir={vm.previewDirUI}
              shakePieceId={vm.shakePieceId}
              showDebugLabels={showDebugLabels}
              setDraggedEl={vm.setDraggedEl}
              onPointerMove={onPointerMoveEffective}
              onPointerUp={onPointerUpEffective}
              onPointerCancel={onPointerCancelEffective}
            />
          </>
        )}

        {/* Bomb detonation FX (after ACK) */}
        <BombExplosionFxLayer bursts={bomb.bombBursts} width={width} reducedMotionHint={swapMs === 0} zIndex={88} mode={bombFxMode} />
      </GridShell>
    </>
  );
}
