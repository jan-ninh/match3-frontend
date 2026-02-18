// src/features/grid/ui/GridDevPanels.tsx
import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { EngineState } from '@/gamelogic';
import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';
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

  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevNextTilesPalette?: () => void;

  debugSnapshot: ComponentProps<typeof DebugInputPanel>['snapshot'];
  stateMeta: DevtoolsMeta;
};

export function GridDevPanels({
  enabled,
  width,
  inputLocked,
  showLockoutHints,
  onToggleShowLockoutHints,
  onDevPrevLevel,
  onDevNextLevel,
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
        label: 'level: Prev',
        onPress: onDevPrevLevel,
        disabled: false,
      },
      {
        kind: 'action',
        label: 'level: Next',
        onPress: onDevNextLevel,
        disabled: false,
      },
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
  }, [onDevPrevLevel, onDevNextLevel, onDevResetBoard, onDevNextTilesPalette, inputLocked]);

  const panels = useMemo(() => {
    const onCheatItems = () => {
      if (typeof window === 'undefined') return;

      const grants = { bomb: 5, laser: 5, extraShuffle: 5 } satisfies Partial<Record<PowerKey, number>>;

      window.dispatchEvent(new CustomEvent(POWERS_GRANT_MANY_EVENT, { detail: { grants } }));
    };

    return (
      <div className="flex flex-col gap-3">
        <DebugInputPanel width={width} snapshot={debugSnapshot} hz={DEBUG_OVERLAY_HZ} />

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

        {/*
          NOTE:
          DebugDevToolsPanel has its own global "locked" behavior.
          For demos, we keep the panel interactive and rely on per-action `disabled`.
        */}
        <DebugDevToolsPanel locked={false} meta={stateMeta} items={devItems} actions={devActions} />
      </div>
    );
  }, [width, debugSnapshot, stateMeta, devItems, devActions]);

  return useDevPanelsPortal(enabled, panels, { laneId: 'dev-left-lane' });
}
