// src/features/grid/ui/Grid.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';

import type { EngineState } from '@/gamelogic/types';

import { POWER_ARM_EVENT, type PowerArmDetail } from '@/context/powerEvents';

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
import { LaserRowStrikeFxLayer, type LaserStrikeBurst } from './laser/fx/LaserRowStrikeFxLayer';
import { useLaserRowTargeting } from './laser/useLaserRowTargeting';
import { useLaserTargetingSfx } from './laser/fx/useLaserTargetingSfx';
import { useTargetingTickSfx } from './fx/useTargetingTickSfx';

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

  // -----------------------------
  // Laser SFX timing knobs (UI-only)
  // -----------------------------
  // Targeting "tick" cooldown (ms):
  // - 0 => play on every row change (can spam/overlap)
  // - >0 => rate-limited; tweak for feel
  const LASER_TARGETING_SFX_COOLDOWN_MS = 110;

  // Optional: delay confirm sound to sync with beam FX (default 0 = instant).
  const LASER_CONFIRM_SFX_DELAY_MS = 0;

  const laserSfx = useLaserTargetingSfx({
    armed: laser.laserArmed,
    hoverRow: laser.hoverRow ?? null,
    cooldownMs: LASER_TARGETING_SFX_COOLDOWN_MS,
    confirmDelayMs: LASER_CONFIRM_SFX_DELAY_MS,
  });

  // -----------------------------
  // 3x3gridlaser targeting SFX (UI-only)
  // -----------------------------
  // Assumption: "3x3gridlaser" uses the existing 3×3 targeting hook (currently named bomb).
  // This plays the SAME targeting asset as the row-laser (laser_targeting.mp3) when the 3×3 target changes.
  // No confirm sound here by request.
  const GRIDLASER_3X3_TARGETING_SFX_COOLDOWN_MS = 130;

  const gridLaser3x3TargetKey = useMemo(() => {
    if (!bomb.bombArmed) return null;
    const arr = bomb.bombOverlayIndices;
    if (arr.length === 0) return null;
    return arr.join(',');
  }, [bomb.bombArmed, bomb.bombOverlayIndices]);

  useTargetingTickSfx({
    armed: bomb.bombArmed,
    targetKey: gridLaser3x3TargetKey,
    cooldownMs: GRIDLASER_3X3_TARGETING_SFX_COOLDOWN_MS,
    sfxId: 'laserTargeting',
  });

  // -----------------------------
  // Laser strike FX timing knobs
  // -----------------------------
  // A) FX start delay (ms): when the blue beam becomes visible AFTER the confirm click
  // C) FX lifetime (ms): how long the beam stays visible AFTER it becomes visible
  //
  // NOTE: Keep LaserRowStrikeFxLayer's internal duration roughly in sync with LIFE_MS
  // if you want a clean "ends when removed" feel.
  const LASER_STRIKE_FX_START_DELAY_MS = 620;
  const LASER_STRIKE_FX_LIFE_MS = 420;

  // Laser strike FX (UI-only): play a short blue beam on the chosen row.
  // Triggered when the user confirms a target cell while laser is armed.
  const [laserStrikes, setLaserStrikes] = useState<readonly LaserStrikeBurst[]>([]);
  const laserStrikeSeqRef = useRef(0);
  const laserStrikeTimersRef = useRef<Map<string, number[]>>(new Map());

  const addTimer = (id: string, t: number) => {
    const arr = laserStrikeTimersRef.current.get(id);
    if (arr) arr.push(t);
    else laserStrikeTimersRef.current.set(id, [t]);
  };

  const pushLaserStrike = (row: number, startDelayMs = LASER_STRIKE_FX_START_DELAY_MS, lifeMs = LASER_STRIKE_FX_LIFE_MS) => {
    if (typeof window === 'undefined') return;

    const id = `laserStrike-${Date.now()}-${(laserStrikeSeqRef.current += 1)}`;

    // (A) FX start — optionally delayed
    const tStart = window.setTimeout(() => {
      setLaserStrikes((prev) => [...prev, { id, row }]);

      // (C) FX end — lifetime counted AFTER it becomes visible
      const tEnd = window.setTimeout(() => {
        setLaserStrikes((prev) => prev.filter((b) => b.id !== id));
        laserStrikeTimersRef.current.delete(id);
      }, lifeMs);

      addTimer(id, tEnd);
    }, startDelayMs);

    addTimer(id, tStart);
  };

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;
      for (const arr of laserStrikeTimersRef.current.values()) {
        for (const t of arr) window.clearTimeout(t);
      }
      laserStrikeTimersRef.current.clear();
    };
  }, []);

  const effectiveInputLocked = inputLocked || bomb.bombArmed || laser.laserArmed;
  const capturePointerMove = bomb.bombArmed || laser.laserArmed;

  const cursorClass = useMemo(() => {
    if (effectiveInputLocked && showLockoutHints) return 'cursor-not-allowed';
    if (bomb.bombArmed || laser.laserArmed) return 'cursor-crosshair';
    if (isDragging) return 'cursor-grabbing';
    return 'cursor-grab';
  }, [bomb.bombArmed, effectiveInputLocked, isDragging, laser.laserArmed, showLockoutHints]);

  // While in targeting mode (bomb/laser), force the crosshair cursor globally.
  // - fixes "cursor disappears" when leaving the grid or hovering elements that set their own cursor.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cls = 'match3-targeting-cursor';
    const root = document.documentElement;

    const styleId = 'match3-targeting-cursor-style';
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = `
.${cls},
.${cls} * {
  cursor: crosshair !important;
}
`.trim();
      document.head.appendChild(el);
    }

    const targeting = bomb.bombArmed || laser.laserArmed;
    if (targeting) root.classList.add(cls);
    else root.classList.remove(cls);

    return () => {
      root.classList.remove(cls);
    };
  }, [bomb.bombArmed, laser.laserArmed]);

  // While in LASER targeting mode, allow quick cancel:
  // - Right mouse button (anywhere)
  // - Click outside the grid board
  // This only DISARMS (no inventory spend).
  //
  // IMPORTANT BUGFIX:
  // RMB inside the grid must NOT trigger the laser "use-at" handler.
  // So we swallow RMB at the global capture listener (and also guard in cell handler).
  useEffect(() => {
    if (!laser.laserArmed) return;
    if (typeof window === 'undefined') return;

    const emitDisarmLaser = () => {
      const ev = new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, {
        detail: { key: 'laser', armed: false },
      });
      window.dispatchEvent(ev);
    };

    const onGlobalContextMenu = (e: Event) => {
      // Right-click => cancel targeting.
      // Prevent the browser context menu while targeting to avoid accidental UI interruptions.
      if (e instanceof MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      emitDisarmLaser();
    };

    const onGlobalPointerDown = (e: Event) => {
      if (!(e instanceof PointerEvent)) return;

      // RMB => cancel + swallow so Grid cell handlers do not fire.
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        emitDisarmLaser();
        return;
      }

      // Left click outside board => cancel (do NOT swallow; user may want the click to go through).
      if (e.button !== 0) return;

      const boardEl = bomb.boardRef.current;
      if (!boardEl) return;

      const t = e.target;
      if (t instanceof Node && !boardEl.contains(t)) {
        emitDisarmLaser();
      }
    };

    window.addEventListener('contextmenu', onGlobalContextMenu, { capture: true });
    window.addEventListener('pointerdown', onGlobalPointerDown, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', onGlobalContextMenu, true);
      window.removeEventListener('pointerdown', onGlobalPointerDown, true);
    };
  }, [bomb.boardRef, laser.laserArmed]);

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
    // Guard: RMB should never trigger targeting "use-at" inside grid.
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (bomb.bombArmed) {
      // 3x3gridlaser: NO confirm SFX (by request).
      bomb.onCellPointerDown(index, e);
      return;
    }
    if (laser.laserArmed) {
      // Row-laser confirm SFX (by original laser goal).
      laserSfx.playConfirm();

      // UI-only: strike beam timing is controlled by the knobs above.
      pushLaserStrike(Math.floor(index / width));
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

        {/* Laser strike FX (on confirm; UI-only) */}
        <LaserRowStrikeFxLayer bursts={laserStrikes} height={height} reducedMotionHint={swapMs === 0} zIndex={86} />

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
