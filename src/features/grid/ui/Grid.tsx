import { useMemo, useRef } from 'react';
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

  // runtime debug toggle (press D)
  debugEnabled?: boolean;

  // dev action: reset board (only shown when debugEnabled)
  onDevResetBoard?: () => void;
};

export default function Grid({
  state,
  inputLocked,
  showLockoutHints,
  onToggleShowLockoutHints,
  canSwapAt,
  onIntent,
  debugEnabled = false,
  onDevResetBoard,
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
  } = useGridInput({ state, inputLocked, canSwapAt, onIntent, debugEnabled });

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
        label: 'reset: Board',
        onPress: onDevResetBoard,
        disabled: inputLocked,
      },
    ];
  }, [onDevResetBoard, inputLocked]);

  const lockoutCursor = inputLocked && showLockoutHints ? 'cursor-not-allowed' : '';

  const leftLane = typeof document !== 'undefined' ? (document.getElementById('dev-left-lane') as HTMLElement | null) : null;

  const devPanels =
    isDev && debugEnabled && leftLane
      ? createPortal(
          <div className="flex flex-col gap-3">
            <DebugInputPanel width={width} snapshot={debugSnapshot} hz={DEBUG_OVERLAY_HZ} />
            <DebugDevToolsPanel locked={inputLocked} items={devItems} actions={devActions} />
          </div>,
          leftLane,
        )
      : null;

  return (
    <>
      {devPanels}

      <div
        ref={containerRef}
        className={`relative rounded-2xl p-3 bg-black/30 border border-white/10 shadow-lg select-none ${lockoutCursor}`}
        style={{
          width: innerW + BOARD_PADDING * 2,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <GridLockoutOverlay active={inputLocked} show={showLockoutHints} />

        <div className="relative" style={{ width: innerW, height: innerH }}>
          <GridCellsLayer width={width} height={height} cells={cells} onCellPointerDown={onCellPointerDown} />

          <GridOverlaysLayer selectionPos={selectionPos} overPos={overPos} />

          <GridPiecesLayer
            width={width}
            pieces={pieceList}
            dragPieceId={dragPieceId}
            isDragging={isDragging}
            previewActive={previewActive}
            previewOtherPieceId={previewOtherPieceId}
            previewAxis={previewAxisUI}
            previewDir={previewDirUI}
            shakePieceId={shakePieceId}
            setDraggedEl={setDraggedEl}
          />
        </div>
      </div>
    </>
  );
}
