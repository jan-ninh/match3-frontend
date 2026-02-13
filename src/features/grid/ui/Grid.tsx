// src/features/grid/ui/Grid.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import type { EngineState } from '@/gamelogic';

import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';

import GridCellsLayer from './GridCellsLayer';
import GridPiecesLayer from './GridPiecesLayer';
import GridOverlaysLayer from './GridOverlaysLayer';
import GridLockoutOverlay from './GridLockoutOverlay';

import { BOARD_PADDING, DEBUG_OVERLAY_HZ, GAP, TILE_SIZE } from '../lib/constants';
import { boardInnerSizePx, cellPixelXY } from '../lib/math';

import { useGridInput } from '../input/useGridInput';

type PowerArmDetail = { key: 'bomb'; armed: boolean };

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
  onIntent: (intent: { type: 'click'; index: number } | { type: 'swap'; from: number; to: number } | { type: 'useBombAt'; index: number }) => void;
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

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

  const [bombArmed, setBombArmed] = useState(false);
  const [bombHoverIndex, setBombHoverIndex] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastHoverRef = useRef<number | null>(null);

  // Listen to global power arm/disarm (GameFooter drives this)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;

      const armed = !!d.armed;
      setBombArmed(armed);
      if (!armed) {
        lastHoverRef.current = null;
        setBombHoverIndex(null);
      }
    };

    window.addEventListener('match3:powerArm', onArm as EventListener);
    return () => window.removeEventListener('match3:powerArm', onArm as EventListener);
  }, []);

  const effectiveInputLocked = inputLocked || bombArmed;

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

  // ─────────────────────────────────────────────
  // Level 04: Laser warning overlay (row/col highlight)
  // ─────────────────────────────────────────────
  const laserOverlay = useMemo(() => {
    const w = state.laserWarning;
    if (!w) return null;

    const step = TILE_SIZE + GAP;

    if (w.kind === 'row') {
      const top = w.index * step;
      return {
        left: 0,
        top,
        width: innerW,
        height: TILE_SIZE,
      } as const;
    }

    const left = w.index * step;
    return {
      left,
      top: 0,
      width: TILE_SIZE,
      height: innerH,
    } as const;
  }, [state.laserWarning, innerW, innerH]);

  // ─────────────────────────────────────────────
  // Bomb targeting (3×3): hover → overlay indices
  // ─────────────────────────────────────────────
  const bombOverlayIndices = useMemo(() => {
    if (!bombArmed) return [];
    if (bombHoverIndex === null) return [];

    const cx = bombHoverIndex % width;
    const cy = Math.floor(bombHoverIndex / width);

    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= width) continue;
        if (y < 0 || y >= height) continue;
        out.push(y * width + x);
      }
    }
    return out;
  }, [bombArmed, bombHoverIndex, width, height]);

  const updateBombHoverFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = boardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Outside board => clear
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        if (lastHoverRef.current !== null) {
          lastHoverRef.current = null;
          setBombHoverIndex(null);
        }
        return;
      }

      // IMPORTANT:
      // We intentionally DO NOT "drop" hover in GAP areas.
      // Instead we map any point within the board rect to the nearest cell.
      const step = TILE_SIZE + GAP;

      const baseCol = clampInt(Math.floor(x / step), 0, width - 1);
      const baseRow = clampInt(Math.floor(y / step), 0, height - 1);

      const inStepX = x - baseCol * step;
      const inStepY = y - baseRow * step;

      const colCandidates: number[] = [baseCol];
      const rowCandidates: number[] = [baseRow];

      if (inStepX > TILE_SIZE) colCandidates.push(baseCol + 1);
      if (inStepY > TILE_SIZE) rowCandidates.push(baseRow + 1);

      // Evaluate nearest by distance to cell center (stable for corners too)
      let bestCol = baseCol;
      let bestRow = baseRow;
      let bestD2 = Number.POSITIVE_INFINITY;

      for (const c0 of colCandidates) {
        const c = clampInt(c0, 0, width - 1);
        for (const r0 of rowCandidates) {
          const r = clampInt(r0, 0, height - 1);

          const cx = c * step + TILE_SIZE * 0.5;
          const cy = r * step + TILE_SIZE * 0.5;

          const dx = x - cx;
          const dy = y - cy;

          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            bestCol = c;
            bestRow = r;
          }
        }
      }

      const idx = bestRow * width + bestCol;

      if (lastHoverRef.current !== idx) {
        lastHoverRef.current = idx;
        setBombHoverIndex(idx);
      }
    },
    [width, height],
  );

  const onPointerMoveShell = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bombArmed) {
      updateBombHoverFromClient(e.clientX, e.clientY);
      return;
    }
    onPointerMove(e);
  };

  const onPointerUpShell = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bombArmed) return;
    onPointerUp(e);
  };

  const onPointerCancelShell = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bombArmed) return;
    onPointerCancel(e);
  };

  const onPointerLeaveShell = () => {
    if (!bombArmed) return;
    lastHoverRef.current = null;
    setBombHoverIndex(null);
  };

  const onCellPointerDownShell = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (bombArmed) {
      if (e.button !== 0) return;
      if (inputLocked) return;

      // confirm -> trigger global power use, then disarm immediately (UI feedback)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('match3:powerUseAt', { detail: { key: 'bomb', index } }));
        window.dispatchEvent(new CustomEvent<PowerArmDetail>('match3:powerArm', { detail: { key: 'bomb', armed: false } }));
      }

      lastHoverRef.current = null;
      setBombHoverIndex(null);
      return;
    }

    onCellPointerDown(index, e);
  };

  // Cursor SSOT (board-level, stable across tiles + gaps)
  const cursorClass = bombArmed ? 'cursor-crosshair' : inputLocked && showLockoutHints ? 'cursor-not-allowed' : 'cursor-pointer';

  return (
    <>
      {devPanels}

      <div
        className={`relative rounded-2xl p-3 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.55)] select-none ${cursorClass}`}
        style={shellStyle}
        onPointerMove={onPointerMoveShell}
        onPointerUp={onPointerUpShell}
        onPointerCancel={onPointerCancelShell}
        onPointerLeave={onPointerLeaveShell}
      >
        <GridLockoutOverlay active={inputLocked} show={showLockoutHints} />

        <div ref={boardRef} className="relative" style={{ width: innerW, height: innerH }}>
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ backgroundColor: 'rgb(0 0 0 / var(--boardDim))' }} />
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 40%, rgba(0,0,0,0.94) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -18px 40px rgba(0,0,0,0.55)',
            }}
          />

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
          {bombArmed && bombOverlayIndices.length ? (
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 44 }}>
              {bombOverlayIndices.map((idx) => {
                const p = cellPixelXY(idx, width);
                return (
                  <div
                    key={idx}
                    className="absolute"
                    style={{
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      transform: `translate(${p.x}px, ${p.y}px)`,
                      background: 'rgba(244,63,94,0.18)',
                      outline: '1px solid rgba(248,113,113,0.38)',
                      boxShadow: '0 0 18px rgba(244,63,94,0.16)',
                    }}
                  />
                );
              })}
            </div>
          ) : null}

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
        </div>
      </div>
    </>
  );
}
