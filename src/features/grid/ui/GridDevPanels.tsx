// src/features/grid/ui/GridDevPanels.tsx
import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { EngineState } from '@/gamelogic';
import { DebugInputPanel, DebugDevToolsPanel } from '@/devtools';

import { DEBUG_OVERLAY_HZ } from '../lib/constants';
import { useDevPanelsPortal } from './hooks/useDevPanelsPortal';

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

  const devActions: ComponentProps<typeof DebugDevToolsPanel>['actions'] = useMemo(() => {
    return [
      {
        kind: 'action',
        label: 'level: Prev',
        onPress: onDevPrevLevel,
        disabled: inputLocked,
      },
      {
        kind: 'action',
        label: 'level: Next',
        onPress: onDevNextLevel,
        disabled: inputLocked,
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
    return (
      <div className="flex flex-col gap-3">
        <DebugInputPanel width={width} snapshot={debugSnapshot} hz={DEBUG_OVERLAY_HZ} />
        <DebugDevToolsPanel locked={inputLocked} meta={stateMeta} items={devItems} actions={devActions} />
      </div>
    );
  }, [width, debugSnapshot, inputLocked, stateMeta, devItems, devActions]);

  return useDevPanelsPortal(enabled, panels, { laneId: 'dev-left-lane' });
}
