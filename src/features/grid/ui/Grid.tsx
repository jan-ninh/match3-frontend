// src/features/grid/ui/Grid.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { EngineState } from '@/gamelogic';
import { getBomb3x3IndicesFromTarget } from '@/gamelogic/itemeffects/bomb3x3';
import {
  POWER_ARM_EVENT,
  POWER_CONSUME_EVENT,
  POWER_USE_AT_EVENT,
  type PowerArmDetail,
  type PowerConsumeDetail,
  type PowerUseAtDetail,
} from '@/context/powerEvents';
import type { BombTarget } from './bomb/typesBomb';
import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';
import GridCellsLayer from './GridCellsLayer';
import GridPiecesLayer from './GridPiecesLayer';
import GridOverlaysLayer from './GridOverlaysLayer';
import GridLockoutOverlay from './GridLockoutOverlay';
import { BOARD_PADDING, DEBUG_OVERLAY_HZ, GAP, TILE_SIZE } from '../lib/constants';
import { boardInnerSizePx, cellPixelXY } from '../lib/math';
import { useGridInput } from '../input/useGridInput';

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
  const [bombHoverTarget, _setBombHoverTarget] = useState<BombTarget | null>(null);

  const bombHoverTargetRef = useRef<BombTarget | null>(null);
  const setBombHoverTarget = useCallback((t: BombTarget | null) => {
    bombHoverTargetRef.current = t;
    _setBombHoverTarget(t);
  }, []);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastHoverRef = useRef<string | null>(null);

  const powerReqIdRef = useRef(1);
  const pendingConsumeRef = useRef<Set<number>>(new Set());

  const clearBombHover = useCallback(() => {
    lastHoverRef.current = null;
    setBombHoverTarget(null);
  }, [setBombHoverTarget]);

  const disarmBombTargeting = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed: false } }));
    }
    clearBombHover();
  }, [clearBombHover]);

  // Listen to global power arm/disarm (GameFooter drives this)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;

      const armed = !!d.armed;
      setBombArmed(armed);

      if (!armed) clearBombHover();
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, [clearBombHover]);

  // Safety: if engine locks while bomb mode is armed, disarm (avoids "stuck crosshair")
  // eslint react-hooks/set-state-in-effect: schedule disarm async (no sync setState in effect body)
  useEffect(() => {
    if (!bombArmed) return;
    if (!inputLocked) return;
    if (typeof window === 'undefined') return;

    const id = window.setTimeout(() => {
      disarmBombTargeting();
    }, 0);

    return () => window.clearTimeout(id);
  }, [bombArmed, inputLocked, disarmBombTargeting]);

  // Consume power only after engine ACK event (powerUsed)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pendingConsumeRef.current.size === 0) return;

    for (const ev of state.events) {
      if (ev.type !== 'powerUsed') continue;

      const requestId = ev.requestId | 0;
      if (!pendingConsumeRef.current.has(requestId)) continue;

      pendingConsumeRef.current.delete(requestId);

      const detail: PowerConsumeDetail = { key: ev.key, amount: 1, requestId };
      window.dispatchEvent(new CustomEvent<PowerConsumeDetail>(POWER_CONSUME_EVENT, { detail }));
    }
  }, [state.events]);

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
  // Supports off-grid center by 1 cell: x/y ∈ [-1..w]×[-1..h]
  // ─────────────────────────────────────────────
  const bombOverlayIndices = useMemo(() => {
    if (!bombArmed) return [];
    if (!bombHoverTarget) return [];
    return getBomb3x3IndicesFromTarget(bombHoverTarget, width, height);
  }, [bombArmed, bombHoverTarget, width, height]);

  const confirmBombAt = useCallback(
    (target: BombTarget) => {
      // If engine is locked, abort targeting (avoid getting stuck)
      if (inputLocked) {
        disarmBombTargeting();
        return;
      }

      const indices = getBomb3x3IndicesFromTarget(target, width, height);

      // If no red target would exist -> abort targeting
      if (indices.length === 0) {
        disarmBombTargeting();
        return;
      }

      const requestId = powerReqIdRef.current++;
      pendingConsumeRef.current.add(requestId);

      if (typeof window !== 'undefined') {
        const detail: PowerUseAtDetail = { key: 'bomb', target, requestId };
        window.dispatchEvent(new CustomEvent<PowerUseAtDetail>(POWER_USE_AT_EVENT, { detail }));
        window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed: false } }));
      }

      clearBombHover();
    },
    [inputLocked, width, height, clearBombHover, disarmBombTargeting],
  );

  const updateBombHoverFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = boardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const step = TILE_SIZE + GAP;

      // nearest center among a small candidate neighborhood (incl. off-grid -1/+1)
      const baseCol = Math.floor(x / step);
      const baseRow = Math.floor(y / step);

      const colCandidates = [baseCol - 1, baseCol, baseCol + 1, baseCol + 2];
      const rowCandidates = [baseRow - 1, baseRow, baseRow + 1, baseRow + 2];

      let bestCol = 0;
      let bestRow = 0;
      let bestD2 = Number.POSITIVE_INFINITY;

      for (const c of colCandidates) {
        if (c < -1 || c > width) continue;
        const cx = c * step + TILE_SIZE * 0.5;

        for (const r of rowCandidates) {
          if (r < -1 || r > height) continue;
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

      // "near enough" gate: prevents selecting a target when you're far away in the HUD
      const radius = Math.max(12, step * 0.8);
      if (bestD2 > radius * radius) {
        if (lastHoverRef.current !== null) clearBombHover();
        return;
      }

      const key = `${bestCol},${bestRow}`;
      if (lastHoverRef.current !== key) {
        lastHoverRef.current = key;
        setBombHoverTarget({ x: bestCol, y: bestRow });
      }
    },
    [width, height, clearBombHover, setBombHoverTarget],
  );

  // ─────────────────────────────────────────────
  // Viewport-level Bomb Targeting (HUD + outside-board)
  // - right click/contextmenu => abort + disarm
  // - left click without red target => abort + disarm
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const stageEl = document.getElementById('app-stage');
    if (!stageEl) return;

    if (bombArmed) stageEl.classList.add('match3-cursor-crosshair');
    else stageEl.classList.remove('match3-cursor-crosshair');

    if (!bombArmed) return;

    const isInsideStage = (clientX: number, clientY: number) => {
      const r = stageEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };

    const onMove = (e: PointerEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) {
        clearBombHover();
        return;
      }
      updateBombHoverFromClient(e.clientX, e.clientY);
    };

    const onLeave = () => {
      clearBombHover();
    };

    const abort = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      disarmBombTargeting();
    };

    const onDown = (e: PointerEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) return;

      // Right click => abort
      if (e.button === 2) {
        abort(e);
        return;
      }

      // Only left click confirms (and owns the click in bomb mode)
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      updateBombHoverFromClient(e.clientX, e.clientY);

      const t = bombHoverTargetRef.current;
      if (!t) {
        // click in viewport without a red target => abort
        disarmBombTargeting();
        return;
      }

      // if this target would not render any red tiles => abort
      const indices = getBomb3x3IndicesFromTarget(t, width, height);
      if (indices.length === 0) {
        disarmBombTargeting();
        return;
      }

      confirmBombAt(t);
    };

    // Context menu (right click) => abort + no browser menu
    const onContextMenu = (e: MouseEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) return;
      abort(e);
    };

    stageEl.addEventListener('pointermove', onMove);
    stageEl.addEventListener('pointerleave', onLeave);
    stageEl.addEventListener('pointerdown', onDown, { capture: true });
    stageEl.addEventListener('contextmenu', onContextMenu, { capture: true });

    return () => {
      stageEl.removeEventListener('pointermove', onMove);
      stageEl.removeEventListener('pointerleave', onLeave);
      stageEl.removeEventListener('pointerdown', onDown, true);
      stageEl.removeEventListener('contextmenu', onContextMenu, true);
      stageEl.classList.remove('match3-cursor-crosshair');
    };
  }, [bombArmed, clearBombHover, updateBombHoverFromClient, confirmBombAt, disarmBombTargeting, width, height]);

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
    clearBombHover();
  };

  const onCellPointerDownShell = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (bombArmed) {
      // right click on cell => abort
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        disarmBombTargeting();
        return;
      }

      if (e.button !== 0) return;

      const x = index % width;
      const y = Math.floor(index / width);

      confirmBombAt({ x, y });
      return;
    }

    onCellPointerDown(index, e);
  };

  // Cursor (board-level): normal unless lockout hints say otherwise
  const cursorClass = inputLocked && showLockoutHints ? 'cursor-not-allowed' : 'cursor-default';

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
