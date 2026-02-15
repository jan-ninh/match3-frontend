// src/features/grid/ui/Grid.tsx
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import type { EngineState } from '@/gamelogic';

import GridCellsLayer from './GridCellsLayer';
import GridPiecesLayer from './GridPiecesLayer';
import GridOverlaysLayer from './GridOverlaysLayer';

import { BOARD_PADDING } from '../lib/constants';
import { boardInnerSizePx, cellPixelXY } from '../lib/math';

import { useGridInput } from '../input/useGridInput';

import type { BombTarget } from './bomb/typesBomb';
import { BombOverlay } from './bomb/BombOverlay';
import { useBomb3x3Targeting } from './bomb/useBomb3x3Targeting';

import { BombExplosionFxLayer, type BombVfxMode } from './bomb/fx/BombExplosionFxLayer';

import { GridShell } from './GridShell';
import { LaserWarningOverlay } from './LaserWarningOverlay';
import { GridDevPanels } from './GridDevPanels';

type InputIntentLike =
  | { type: 'click'; index: number }
  | { type: 'swap'; from: number; to: number }
  // legacy (useGridInput’s InputIntent enthält das offenbar noch)
  | { type: 'useBombAt'; index: number }
  // current
  | { type: 'useItemAt'; key: 'bomb3x3'; target: BombTarget };

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
  onIntent: (intent: InputIntentLike) => void;

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

const LS_KEY_BOMB_VFX = 'match3.dev.bombVfxMode';

// TOGGLE STANDARD BOMBANIMATION (legacy | flipbook)
function readBombVfxModeFromStorage(): BombVfxMode {
  if (!import.meta.env.DEV) return 'legacyShock';
  if (typeof window === 'undefined') return 'legacyShock';

  try {
    const raw = window.localStorage.getItem(LS_KEY_BOMB_VFX);
    if (raw === 'legacyShock' || raw === 'flipbook') return raw;
  } catch {
    // ignore (privacy mode)
  }

  return 'legacyShock';
}

function writeBombVfxModeToStorage(mode: BombVfxMode) {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LS_KEY_BOMB_VFX, mode);
  } catch {
    // ignore (privacy mode)
  }
}

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

  const { w: innerW, h: innerH } = useMemo(() => boardInnerSizePx(width, height), [width, height]);

  const bomb = useBomb3x3Targeting({
    width,
    height,
    inputLocked,
    engineEvents: state.events,
    reducedMotion: swapMs === 0,
    stageElementId: 'app-stage',
  });

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

  const showDebugLabels = isDev && debugEnabled;

  const [bombVfxMode, setBombVfxMode] = useState<BombVfxMode>(() => readBombVfxModeFromStorage());

  // DEV-only toggle: press "V" to switch Bomb VFX (Flipbook <-> LegacyShock)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!isDev) return;
    if (!debugEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'v' && e.key !== 'V') return;

      // do not interfere with text inputs
      const tag = (e.target instanceof Element ? e.target.tagName : '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      e.preventDefault();

      setBombVfxMode((prev) => {
        const next: BombVfxMode = prev === 'flipbook' ? 'legacyShock' : 'flipbook';
        writeBombVfxModeToStorage(next);
        return next;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDev, debugEnabled]);

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

  // Cursor (board-level): normal unless lockout hints say otherwise
  const cursorClass = inputLocked && showLockoutHints ? 'cursor-not-allowed' : 'cursor-default';

  const onPointerMoveShell = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed) {
      bomb.onShellPointerMove(e);
      return;
    }
    onPointerMove(e);
  };

  const onPointerUpShell = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed) return;
    onPointerUp(e);
  };

  const onPointerCancelShell = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bomb.bombArmed) return;
    onPointerCancel(e);
  };

  const onPointerLeaveShell = () => {
    if (!bomb.bombArmed) return;
    bomb.onShellPointerLeave();
  };

  const onCellPointerDownShell = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (bomb.bombArmed) {
      bomb.onCellPointerDown(index, e);
      return;
    }
    onCellPointerDown(index, e);
  };

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
        onPointerMove={onPointerMoveShell}
        onPointerUp={onPointerUpShell}
        onPointerCancel={onPointerCancelShell}
        onPointerLeave={onPointerLeaveShell}
      >
        {/* Laser Warning highlight (under cells/pieces, above bg) */}
        <LaserWarningOverlay warning={state.laserWarning} innerW={innerW} innerH={innerH} />

        {/* DEV label for VFX toggle */}
        {import.meta.env.DEV && isDev && debugEnabled ? (
          <div className="absolute left-2 top-2 z-[200] pointer-events-none select-none text-[10px] text-white/70">
            BombVFX: {bombFxMode === 'flipbook' ? 'Flipbook' : 'LegacyShock'} (press V)
          </div>
        ) : null}

        {/* Bomb Targeting 3×3 (square corners, red glow) */}
        <BombOverlay indices={bomb.bombOverlayIndices} width={width} zIndex={44} />

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

        {/* Bomb detonation FX (after ACK) */}
        <BombExplosionFxLayer bursts={bomb.bombBursts} width={width} reducedMotionHint={swapMs === 0} zIndex={88} mode={bombFxMode} />
      </GridShell>
    </>
  );
}
