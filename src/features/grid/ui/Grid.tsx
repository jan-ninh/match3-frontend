import { useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import type { EngineState } from '@/gamelogic';

import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';

import GridCellsLayer from './GridCellsLayer';
import GridPiecesLayer from './GridPiecesLayer';
import GridOverlaysLayer from './GridOverlaysLayer';
import GridLockoutOverlay from './GridLockoutOverlay';

import { BOARD_PADDING, DEBUG_OVERLAY_HZ } from '../lib/constants';
import { boardInnerSizePx, cellPixelXY } from '../lib/math';

import { useGridInput } from '../input/useGridInput';

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
  onIntent: (intent: { type: 'click'; index: number } | { type: 'swap'; from: number; to: number }) => void;
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

  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    isDev,
    debugSnapshot,

    pieceList,

    dragPieceId,
    isDragging,
    overIndexUI,
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
  } = useGridInput({ state, inputLocked, canSwapAt, onIntent, debugEnabled, swapMs });

  const { w: innerW, h: innerH } = useMemo(() => boardInnerSizePx(width, height), [width, height]);

  const selectionPos = useMemo(() => {
    if (selectedIndex === null) return null;
    const cell = cells[selectedIndex];
    if (!cell || cell.blocked) return null;
    return cellPixelXY(selectedIndex, width);
  }, [selectedIndex, cells, width]);

  const overPos = useMemo(() => {
    if (!isDragging) return null;
    if (overIndexUI === null) return null;
    const cell = cells[overIndexUI];
    if (!cell || cell.blocked) return null;
    return cellPixelXY(overIndexUI, width);
  }, [isDragging, overIndexUI, cells, width]);

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

      },];
  }, [onDevPrevLevel, onDevNextLevel, onDevResetBoard, onDevNextTilesPalette, inputLocked]);

  const lockoutCursor = inputLocked && showLockoutHints ? 'cursor-not-allowed' : '';
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



  const leftLane = typeof document !== 'undefined' ? (document.getElementById('dev-left-lane') as HTMLElement | null) : null;

  const devPanels =
    isDev && debugEnabled && leftLane
      ? createPortal(
          <div className="flex flex-col gap-3">
            <DebugInputPanel width={width} snapshot={debugSnapshot} hz={DEBUG_OVERLAY_HZ} />
            <DebugDevToolsPanel locked={inputLocked} meta={{ levelId: state.levelId, width, height, seed: state.seed }} items={devItems} actions={devActions} />
          </div>,
          leftLane,
        )
      : null;

  return (
    <>
      {devPanels}

      <div
        ref={containerRef}
        className={`relative rounded-2xl p-3 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.55)] select-none ${lockoutCursor}`}
        style={shellStyle}

        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <GridLockoutOverlay active={inputLocked} show={showLockoutHints} />

        <div className="relative" style={{ width: innerW, height: innerH }}>
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ backgroundColor: 'rgb(0 0 0 / var(--boardDim))' }}
          />
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 40%, rgba(0,0,0,0.94) 100%)',

              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -18px 40px rgba(0,0,0,0.55)',
            }}
          />
          <GridCellsLayer width={width} height={height} cells={cells} onCellPointerDown={onCellPointerDown} showDebugLabels={showDebugLabels} />

          <GridOverlaysLayer selectionPos={selectionPos} overPos={overPos} />

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
        </div>
      </div>
    </>
  );
}
