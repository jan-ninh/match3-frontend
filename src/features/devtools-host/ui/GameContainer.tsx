// src/features/devtools-host/ui/GameContainer.tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { EngineState } from '@/gamelogic';

import { Grid } from '@/features/grid';
import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';

import GameplayHud from './GameplayHud';

type Props = {
  state: EngineState;

  inputLocked: boolean;

  // Game rules injected: Grid doesn't know what is "legal".
  canSwapAt: (from: number, to: number) => boolean;

  // Grid emits only intents. Parent decides what to do with them.
  onIntent: (intent: { type: 'click'; index: number } | { type: 'swap'; from: number; to: number }) => void;

  // Runtime / environment
  isDev?: boolean;
  debugEnabled?: boolean;

  // Dev-only visuals for lockout feedback (cursor/dim/badge).
  showLockoutHints?: boolean;
  onToggleShowLockoutHints?: () => void;

  // Dev actions (optional)
  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevNextTilesPalette?: () => void;

  // Optional ref injection (devtoolsHost uses this for panel top sync)
  gridRowRef?: RefObject<HTMLDivElement | null>;

  // Used by devtoolsHost to force rerender on tiles palette changes.
  // Not used directly here, but prop changes trigger re-render.
  tilesVersion?: number;
};

export default function GameContainer(props: Props) {
  const {
    state,
    inputLocked,
    canSwapAt,
    onIntent,

    isDev = false,
    debugEnabled = false,

    showLockoutHints = false,
    onToggleShowLockoutHints,

    onDevResetBoard,
    onDevPrevLevel,
    onDevNextLevel,
    onDevNextTilesPalette,

    gridRowRef: externalGridRowRef,
  } = props;

  // allow devtoolsHost to inject the ref; otherwise fall back to an internal one
  const internalGridRowRef = useRef<HTMLDivElement | null>(null);
  const gridRowRef = externalGridRowRef ?? internalGridRowRef;

  // "game-stage-viewport" container (absolute children refer to this)
  const stageRef = useRef<HTMLDivElement | null>(null);

  // HUD darf nie in den Grid-Bereich wachsen -> maxHeight bis Grid-Oberkante
  const [hudMaxPx, setHudMaxPx] = useState<number | null>(null);

  useEffect(() => {
    setTilesetLevel(state.levelId);
    preloadTiles();
  }, [state.levelId]);

  // Recompute HUD max height when stage/grid geometry changes
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const stageEl = stageRef.current;
    const gridEl = gridRowRef.current;
    if (!stageEl || !gridEl) return;

    const GAP_PX = 12; // Abstand zwischen HUD-Unterkante und Grid-Oberkante

    let raf = 0;

    const recalc = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const s = stageEl.getBoundingClientRect();
        const g = gridEl.getBoundingClientRect();

        // max HUD = bis zur Grid-Oberkante (relativ zum Stage-Top)
        const next = Math.max(0, Math.round(g.top - s.top - GAP_PX));

        setHudMaxPx((prev) => (prev === next ? prev : next));
      });
    };

    recalc();

    const onResize = () => recalc();
    window.addEventListener('resize', onResize);

    // Observe geometry changes (grid size may change with level/scale/etc.)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => recalc());
      ro.observe(stageEl);
      ro.observe(gridEl);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [gridRowRef]);

  const breachTotal = state.breachesTotal ?? 0;
  const breachLeft = state.breachesRemaining ?? 0;
  const breachDone = Math.max(0, breachTotal - breachLeft);

  const leaksTotal = state.leaksTotal ?? 0;
  const leaksSealed = state.leaksSealed ?? 0;

  const contaminationThreshold = state.contaminationLoseThreshold ?? null;
  const contaminationCount = useMemo(() => {
    let n = 0;
    for (const c of state.cells) {
      if (c.obstacle?.kind === 'contamination') n++;
    }
    return n;
  }, [state.cells]);

  const isWin = state.phase === 'win';
  const isLose = state.phase === 'lose';

  const objectiveKind: 'spikes' | 'nodes' | 'leaks' | 'terminals' | 'none' = (() => {
    if ((state.terminalsTotal ?? 0) > 0) return 'terminals';
    if (leaksTotal > 0) return 'leaks';

    const hasFirewall = state.cells.some((c) => c.obstacle?.kind === 'firewall');
    if (!hasFirewall) return 'none';

    // Level 1 “spikes” are implemented via firewall nodes with maxHp=1.
    const looksLikeSpikes = state.cells.some((c) => c.obstacle?.kind === 'firewall' && c.obstacle.maxHp <= 1);
    return looksLikeSpikes ? 'spikes' : 'nodes';
  })();

  // Level 03: Terminal states for HUD
  const terminalStates = useMemo(() => {
    const terminals: Array<{
      id: number;
      state: 'locked' | 'open' | 'verified';
      charge: number;
      required: number;
      color: string;
    }> = [];

    for (const cell of state.cells) {
      const obs = cell.obstacle;
      if (obs?.kind === 'terminal') {
        terminals.push({
          id: obs.id,
          state: obs.state,
          charge: obs.charge,
          required: obs.requiredCharge,
          color: obs.chargeColor,
        });
      }
    }

    return terminals.sort((a, b) => a.id - b.id);
  }, [state.cells]);

  return (
    <div
      ref={stageRef}
      className={[
        // "game-stage-viewport" height: viewport-relative, but never tiny
        'relative w-full min-h-[max(520px,calc(100svh-12rem))]',
      ].join(' ')}
    >
      {/* GRID: fixed position relative to stage viewport (independent of HUD) */}
      <div
        ref={gridRowRef}
        className={[
          'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10',
          // 🔧 ADJUST GRID POSITION: 50%  = center (60% = center + 10% nach unten)
          'top-[62%]',
        ].join(' ')}
      >
        <Grid
          state={state}
          inputLocked={inputLocked}
          showLockoutHints={showLockoutHints}
          onToggleShowLockoutHints={onToggleShowLockoutHints}
          canSwapAt={canSwapAt}
          onIntent={onIntent}
          debugEnabled={debugEnabled}
          onDevResetBoard={onDevResetBoard}
          onDevPrevLevel={onDevPrevLevel}
          onDevNextLevel={onDevNextLevel}
          onDevNextTilesPalette={onDevNextTilesPalette}
          swapMs={state.swapMs}
        />
      </div>

      {/* HUD: absolute, and clipped to the space above the grid */}
      <div className="absolute inset-x-0 top-0 z-20 overflow-y-hidden overflow-x-visible" style={{ maxHeight: hudMaxPx !== null ? `${hudMaxPx}px` : '45%' }}>
        <GameplayHud
          levelId={state.levelId}
          gateOpen={state.gateOpen}
          breachDone={breachDone}
          breachTotal={breachTotal}
          leaksSealed={leaksSealed}
          leaksTotal={leaksTotal}
          contaminationCount={contaminationCount}
          contaminationThreshold={contaminationThreshold}
          terminalsVerified={state.terminalsVerified ?? 0}
          terminalsTotal={state.terminalsTotal ?? 0}
          terminalStates={terminalStates}
          movesLeft={state.movesLeft ?? '—'}
          isWin={isWin}
          isLose={isLose}
          objectiveKind={objectiveKind}
        />
      </div>

      {/* keep props read for React rerendering on dev palette changes */}
      {isDev ? null : null}
    </div>
  );
}
