import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type { EngineState } from '@/gamelogic';
import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';

import GridCellsLayer from './GridCellsLayer';
import GridPiecesLayer from './GridPiecesLayer';
import GridOverlaysLayer from './GridOverlaysLayer';

import { GridShell } from './GridShell';
import { BombOverlay } from './bomb/BombOverlay';
import { useBombTargeting } from './bomb/useBombTargeting';
import { useDevPanelsPortal } from './hooks/useDevPanelsPortal';
import { useLaserOverlay } from './hooks/useLaserOverlay';

import { BOARD_PADDING, DEBUG_OVERLAY_HZ, GAP, TILE_SIZE } from '../lib/constants';
import { boardInnerSizePx, cellPixelXY } from '../lib/math';

import { useGridInput } from '../input/useGridInput';

type BombTarget = {
  x: number;
  y: number;
};

type Props = {
  state: EngineState;

  // Engine-relevant lockout (prevents overlapping actions).
  inputLocked: boolean;

  // Dev-only visuals for lockout feedback (cursor/dim/badge).
  showLockoutHints: boolean;
  onToggleShowLockoutHints?: () => void;

  // Game rules injected: Grid doesn't know what is "legal".
  canSwapAt: (from: number, to: number) => boolean;

  // Grid emits only intents. Parent decides what to do with them.
  onIntent: (
    intent: { type: 'click'; index: number } | { type: 'swap'; from: number; to: number } | { type: 'useBombAt'; target: BombTarget },
  ) => void;

  swapMs: number;

  // runtime debug toggle (press D)
  debugEnabled?: boolean;

  // dev action: reset board (only shown when debugEnabled)
  onDevResetBoard?: () => void;
  // dev action: level nav (only shown when debugEnabled)
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevNextTilesPalette?: () => void;
};

type CssVars = CSSProperties & { '--boardDim'?: number };

export default function Grid({
  state,
  inputLocked,
  showLockoutHints,
  onToggleShowLockoutHints,
  canSwapAt,
  onIntent,
  swapMs,
  debugEnabled = false,
  onDevResetBoard,
  onDevPrevLevel,
  onDevNextLevel,
  onDevNextTilesPalette,
}: Props) {
  const { width, height, cells, selectedIndex } = state;

  const bomb = useBombTargeting({ width, height, inputLocked });
  const effectiveInputLocked = inputLocked || bomb.bombArmed;

  const {
    isDev,
    debugSnapshot,

    pieceList,

    dragPieceId,
    isDragging,
    shakePieceId,

    previewActive,
    previewOtherPieceId,
    previewAxisUI,
    previewDirUI,

    onCellPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,

    setDraggedEl,
  } = useGridInput({ state, inputLocked: effectiveInputLocked, canSwapAt, onIntent, debugEnabled, swapMs });

  const { w: innerW, h: innerH } = useMemo(() => boardInnerSizePx(width, height), [width, height]);

  const selectionPos = useMemo(() => {
    if (selectedIndex === null) return null;
    const cell = cells[selectedIndex];
    if (!cell || cell.blocked) return null;
    return cellPixelXY(selectedIndex, width);
  }, [selectedIndex, cells, width]);

  // DnD preview target slot (adjacent swap target)
  const targetPos = useMemo(() => {
    if (!isDragging) return null;
    if (!previewActive) return null;
    if (!previewAxisUI) return null;
    if (previewDirUI === 0) return null;
    if (dragPieceId === null) return null;

    const dragged = pieceList.find((p) => p.id === dragPieceId);
    if (!dragged) return null;

    const fromIndex = dragged.cellIndex;

    let toIndex = fromIndex;

    if (previewAxisUI === 'x') {
      const x = fromIndex % width;
      if (previewDirUI === -1 && x === 0) return null;
      if (previewDirUI === 1 && x === width - 1) return null;
      toIndex = fromIndex + previewDirUI;
    } else {
      const y = Math.floor(fromIndex / width);
      if (previewDirUI === -1 && y === 0) return null;
      if (previewDirUI === 1 && y === height - 1) return null;
      toIndex = fromIndex + previewDirUI * width;
    }

    const cell = cells[toIndex];
    if (!cell || cell.blocked) return null;

    return cellPixelXY(toIndex, width);
  }, [isDragging, previewActive, previewAxisUI, previewDirUI, dragPieceId, pieceList, width, height, cells]);

  const devItems = useMemo(() => {
    return [
      {
        kind: 'toggle' as const,
        label: 'show: Input Lockout',
        value: showLockoutHints,
        onToggle: onToggleShowLockoutHints,
      },
    ];
  }, [showLockoutHints, onToggleShowLockoutHints]);

  const devActions = useMemo(() => {
    return [
      {
        kind: 'action' as const,
        label: 'level: Prev',
        onPress: onDevPrevLevel,
        disabled: inputLocked,
      },
      {
        kind: 'action' as const,
        label: 'level: Next',
        onPress: onDevNextLevel,
        disabled: inputLocked,
      },
      {
        kind: 'action' as const,
        label: 'reset: Board',
        onPress: onDevResetBoard,
        disabled: inputLocked,
      },
      {
        kind: 'action' as const,
        label: 'tiles: Next palette',
        onPress: onDevNextTilesPalette,
        disabled: inputLocked,
      },
    ];
  }, [onDevPrevLevel, onDevNextLevel, onDevResetBoard, onDevNextTilesPalette, inputLocked]);

  const devPanels = useDevPanelsPortal(
    isDev && debugEnabled,
    <div className="flex flex-col gap-3">
      <DebugInputPanel width={width} snapshot={debugSnapshot} hz={DEBUG_OVERLAY_HZ} />
      <DebugDevToolsPanel locked={inputLocked} meta={{ levelId: state.levelId, width, height, seed: state.seed }} items={devItems} actions={devActions} />
    </div>,
  );

  const laserOverlay = useLaserOverlay({ warning: state.laserWarning, innerW, innerH });

  const showDebugLabels = isDev && debugEnabled;

  const shellStyle: CssVars = {
    width: innerW + BOARD_PADDING * 2,
    touchAction: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',

    // 0..1 (higher = darker / less BG visible)
    '--boardDim': 0.92,

    // applies to the padding/rim area of the board shell
    backgroundColor: 'rgb(0 0 0 / var(--boardDim))',
  };

  const cursorClass = inputLocked && showLockoutHints ? 'cursor-not-allowed' : 'cursor-default';

  const ignorePointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    void e;
  };

  const onPointerMoveShell = bomb.bombArmed ? bomb.onShellPointerMove : onPointerMove;
  const onPointerUpShell = bomb.bombArmed ? ignorePointer : onPointerUp;
  const onPointerCancelShell = bomb.bombArmed ? ignorePointer : onPointerCancel;
  const onPointerLeaveShell = bomb.bombArmed ? bomb.onShellPointerLeave : () => {};

  const onCellPointerDownShell = bomb.bombArmed ? bomb.onCellPointerDown : onCellPointerDown;

  return (
    <>
      {devPanels}

      <GridShell
        shellStyle={shellStyle}
        cursorClass={cursorClass}
        inputLocked={inputLocked}
        showLockoutHints={showLockoutHints}
        innerW={innerW}
        innerH={innerH}
        boardRef={bomb.boardRef}
        onPointerMove={onPointerMoveShell}
        onPointerUp={onPointerUpShell}
        onPointerCancel={onPointerCancelShell}
        onPointerLeave={onPointerLeaveShell}
      >
        {/* Laser Warning highlight (under cells/pieces, above bg) */}
        {laserOverlay ? (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {/* soft fill */}
            <div
              className="absolute rounded-xl animate-pulse"
              style={{
                ...laserOverlay,
                background:
                  state.laserWarning?.kind === 'row'
                    ? 'linear-gradient(90deg, rgba(244,63,94,0.00) 0%, rgba(244,63,94,0.16) 18%, rgba(244,63,94,0.20) 50%, rgba(244,63,94,0.16) 82%, rgba(244,63,94,0.00) 100%)'
                    : 'linear-gradient(180deg, rgba(244,63,94,0.00) 0%, rgba(244,63,94,0.16) 18%, rgba(244,63,94,0.20) 50%, rgba(244,63,94,0.16) 82%, rgba(244,63,94,0.00) 100%)',
                boxShadow: '0 0 26px rgba(244,63,94,0.18), 0 0 52px rgba(244,63,94,0.10)',
              }}
            />

            {/* crisp outline */}
            <div
              className="absolute rounded-xl"
              style={{
                ...laserOverlay,
                outline: '1px solid rgba(248,113,113,0.32)',
                boxShadow: 'inset 0 0 0 1px rgba(244,63,94,0.14)',
              }}
            />

            {/* subtle scanlines */}
            <div
              className="absolute rounded-xl opacity-70"
              style={{
                ...laserOverlay,
                background:
                  state.laserWarning?.kind === 'row'
                    ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.00) 0px, rgba(255,255,255,0.00) 10px, rgba(255,255,255,0.06) 11px)'
                    : 'repeating-linear-gradient(0deg, rgba(255,255,255,0.00) 0px, rgba(255,255,255,0.00) 10px, rgba(255,255,255,0.06) 11px)',
                mixBlendMode: 'screen',
              }}
            />
          </div>
        ) : null}

        {/* Bomb Targeting 3×3 (square corners, red glow) */}
        {bomb.bombArmed ? <BombOverlay indices={bomb.bombOverlayIndices} width={width} /> : null}

        <GridCellsLayer width={width} height={height} cells={cells} onCellPointerDown={onCellPointerDownShell} showDebugLabels={showDebugLabels} />

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
      </GridShell>
    </>
  );
}
