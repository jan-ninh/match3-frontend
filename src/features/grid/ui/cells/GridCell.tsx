import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { TILE_SIZE } from '../../lib/constants';
import { getCellButtonClass } from './cellBaseClass';
import { DebugCoordLabel } from './DebugCoordLabel';

type Props = {
  disabled: boolean;
  ariaLabel: string;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  showDebugLabel: boolean;
  x: number;
  y: number;
  children: ReactNode;
};

export function GridCell({ disabled, ariaLabel, onPointerDown, showDebugLabel, x, y, children }: Props) {
  const base = getCellButtonClass(disabled);

  return (
    <button
      type="button"
      className={base}
      style={{ width: TILE_SIZE, height: TILE_SIZE }}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
    >
      {showDebugLabel ? <DebugCoordLabel x={x} y={y} /> : null}
      {children}
    </button>
  );
}
