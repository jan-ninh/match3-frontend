import { useMemo } from 'react';

import { GAP, TILE_SIZE } from '../../lib/constants';

export type LaserWarningLike = Readonly<{
  kind: 'row' | 'col';
  index: number;
}>;

export type LaserOverlayRect = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

type Args = {
  warning: LaserWarningLike | null | undefined;
  innerW: number;
  innerH: number;
};

export function useLaserOverlay({ warning, innerW, innerH }: Args): LaserOverlayRect | null {
  return useMemo(() => {
    if (!warning) return null;

    const step = TILE_SIZE + GAP;

    if (warning.kind === 'row') {
      const top = warning.index * step;
      return { left: 0, top, width: innerW, height: TILE_SIZE };
    }

    const left = warning.index * step;
    return { left, top: 0, width: TILE_SIZE, height: innerH };
  }, [warning, innerW, innerH]);
}
