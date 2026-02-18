import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

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

  /**
   * IMPORTANT:
   * We drive input via PointerEvents + the grid input controller (SSOT).
   * The browser still emits a synthetic "click" after pointerdown/up on a <button>.
   * If any parent uses legacy delegated onClick (common during refactors),
   * that click can override the correct pointer-based intent (often falling back to index=0).
   *
   * So: stop bubbling of the synthetic click to prevent legacy handlers from firing.
   */
  const onClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  return (
    <button
      type="button"
      className={base}
      style={{ width: TILE_SIZE, height: TILE_SIZE }}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {showDebugLabel ? <DebugCoordLabel x={x} y={y} /> : null}
      {children}
    </button>
  );
}
