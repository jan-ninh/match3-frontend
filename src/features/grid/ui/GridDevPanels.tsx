import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { EngineState } from '@/gamelogic';
import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';
import { DebugInputPanelBody } from '@/devtools/DebugInputPanel';
import type { PowerKey } from '@/types';

import { DEBUG_OVERLAY_HZ } from '../lib/constants';
import { useDevPanelsPortal } from './hooks/useDevPanelsPortal';

const POWERS_GRANT_MANY_EVENT = 'match3:powersGrantMany' as const;

type DevtoolsMeta = Readonly<{
  levelId: EngineState['levelId'];
  width: number;
  height: number;
  seed: EngineState['seed'];
}>;

type Props = {
  enabled: boolean;

  width: number;

  inputLocked: boolean;

  showLockoutHints: boolean;
  onToggleShowLockoutHints?: () => void;

  // Match hints (DevTools only)
  showMatches?: boolean;
  matchCount?: number;
  onToggleShowMatches?: () => void;

  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevSetLevel?: (levelId: number) => void;
  onDevNextTilesPalette?: () => void;

  debugSnapshot: ComponentProps<typeof DebugInputPanel>['snapshot'];
  stateMeta: DevtoolsMeta;
};

function toIntOrZero(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function GridDevPanels({
  enabled,
  width,
  inputLocked,
  showLockoutHints,
  onToggleShowLockoutHints,
  showMatches = false,
  matchCount,
  onToggleShowMatches,
  onDevPrevLevel,
  onDevNextLevel,
  onDevSetLevel,
  onDevResetBoard,
  onDevNextTilesPalette,
  debugSnapshot,
  stateMeta,
}: Props) {
  const devItems: ComponentProps<typeof DebugDevToolsPanel>['items'] = useMemo(() => {
    return [
      {
        kind: 'toggle',
        label: 'show: Input Lockout',
        value: showLockoutHints,
        onToggle: onToggleShowLockoutHints,
      },
    ];
  }, [showLockoutHints, onToggleShowLockoutHints]);

  // Presentation-friendly:
  // - Allow level hopping even while the engine is input-locked (e.g. during init/anim/cascade).
  // - Keep the other destructive actions locked to avoid weird mid-anim states.
  const devActions: ComponentProps<typeof DebugDevToolsPanel>['actions'] = useMemo(() => {
    return [
      {
        kind: 'action',
        label: 'reset: Board',
        onPress: onDevResetBoard,
        disabled: inputLocked,
      },
      {
        kind: 'action',
        label: 'tiles: Next palette',
        onPress: onDevNextTilesPalette,
        disabled: inputLocked,
      },
    ];
  }, [onDevResetBoard, onDevNextTilesPalette, inputLocked]);

  const panels = useMemo(() => {
    const onCheatItems = () => {
      if (typeof window === 'undefined') return;

      const grants = { bomb: 5, laser: 5, extraShuffle: 5 } satisfies Partial<Record<PowerKey, number>>;

      window.dispatchEvent(new CustomEvent(POWERS_GRANT_MANY_EVENT, { detail: { grants } }));
    };

    const onPrev = () => onDevPrevLevel?.();
    const onNext = () => onDevNextLevel?.();

    const current = stateMeta.levelId | 0;
    const quickLevels = Array.from({ length: 12 }, (_, i) => i + 1);

    const matchCountSafe = toIntOrZero(matchCount);
    const matchToggleDisabled = !onToggleShowMatches;

    const matchBtnClass = showMatches
      ? 'w-full px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/20 border border-cyan-300/25 text-cyan-100/90'
      : 'w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80';

    return (
      /* 0) MAINCONTAINER - LEFT LANE  */
      <div className="flex flex-col gap-3 ">
        {/* 1) CONTAINER - TOP */}
        <div className="flex gap-3">
          {/* a) CONTAINER - INPUT DEBUG */}
          <div className="rounded-2xl p-3 bg-black/30 border border-white/10 shadow-lg w-[280px]">
            <DebugInputPanelBody width={width} snapshot={debugSnapshot} hz={DEBUG_OVERLAY_HZ} />
          </div>
          {/* b) CONTAINER - LEVEL HOPPING  */}
          <div className="w-fit ml-auto self-end rounded-xl border border-white/10 bg-black/35 backdrop-blur p-3">
            <div className="text-xs tracking-widest text-white/60 text-center uppercase mb-2">Level</div>
            {/* b1) PREVIOUS/NEXT  */}
            <div className="flex justify-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous level"
                className=" w-17 h-7 rounded-lg border border-slate-200/15 bg-slate-500/15 hover:bg-slate-500/25 active:bg-slate-500/30 text-slate-100/90 transition-colors select-none"
              >
                <span className="text-lg leading-none">←</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next level"
                className="w-17 h-7 rounded-lg border border-slate-200/15 bg-slate-500/15 hover:bg-slate-500/25 active:bg-slate-500/30 text-slate-100/90 transition-colors select-none"
              >
                <span className="text-lg leading-none">→</span>
              </button>
            </div>
            {/* b2) QUICK JUMP (LEVELGRID 1–12) */}
            <div className="mt-2 grid [grid-template-columns:repeat(4,auto)] justify-center gap-1">
              {quickLevels.map((lvl) => {
                const disabled = !onDevSetLevel || lvl === current;
                const cls = [
                  'h-8 w-8 rounded-md border text-xs font-mono transition-colors select-none',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-500/25 active:bg-slate-500/30',
                  lvl === current ? 'bg-emerald-500/15 border-emerald-300/25 text-emerald-100/90' : 'bg-slate-500/15 border-slate-200/15 text-slate-100/90',
                ].join(' ');
                return (
                  <button key={lvl} type="button" onClick={() => onDevSetLevel?.(lvl)} disabled={disabled} aria-label={`Jump to level ${lvl}`} className={cls}>
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 backdrop-blur p-3">
          <div className="text-xs tracking-widest text-white/60 uppercase mb-2">Cheats</div>
          <button
            type="button"
            onClick={onCheatItems}
            className="w-full px-3 py-2 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-300/30 text-rose-100/90"
          >
            Items: +5 (Bomb / Laser / Reshuffle)
          </button>
        </div>

        <div className="flex flex-nowrap gap-3">
          <div className="min-w-[280px] flex-1">
            {/*
              NOTE:
              DebugDevToolsPanel has its own global "locked" behavior.
              For demos, we keep the panel interactive and rely on per-action `disabled`.
            */}
            <DebugDevToolsPanel locked={false} meta={stateMeta} items={devItems} actions={devActions} />
          </div>

          {/* Match hints — own panel, positioned right of Dev tools panel */}
          <div className="w-[200px] shrink-0 rounded-xl border border-white/10 bg-black/35 backdrop-blur p-3">
            <div className="text-xs tracking-widest text-white/60 uppercase mb-2">Matches</div>
            <button
              type="button"
              onClick={onToggleShowMatches}
              disabled={matchToggleDisabled}
              aria-pressed={showMatches}
              className={[matchBtnClass, matchToggleDisabled ? 'opacity-50 cursor-not-allowed' : ''].join(' ')}
            >
              Show matches: {matchCountSafe}
            </button>
          </div>
        </div>
      </div>
    );
  }, [width, debugSnapshot, stateMeta, devItems, devActions, onDevPrevLevel, onDevNextLevel, onDevSetLevel, matchCount, onToggleShowMatches, showMatches]);

  return useDevPanelsPortal(enabled, panels, { laneId: 'dev-left-lane' });
}
