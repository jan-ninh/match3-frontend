import type { CSSProperties } from 'react';
import { GAP, TILE_SIZE } from '../../lib/constants';

export function getGridLayoutStyle(width: number, height: number): CSSProperties {
  return {
    gap: `${GAP}px`,
    gridTemplateColumns: `repeat(${width}, ${TILE_SIZE}px)`,
    gridTemplateRows: `repeat(${height}, ${TILE_SIZE}px)`,
  };
}
