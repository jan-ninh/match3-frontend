import type { CSSProperties } from 'react';

import { TILE_SIZE } from '../../lib/constants';
import { cellPixelXY } from '../../lib/math';

type Props = {
  indices: readonly number[];
  width: number;
  zIndex?: number;
};

export function BombOverlay({ indices, width, zIndex = 44 }: Props) {
  if (indices.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex }}>
      {indices.map((idx) => {
        const p = cellPixelXY(idx, width);

        const style: CSSProperties = {
          width: TILE_SIZE,
          height: TILE_SIZE,
          transform: `translate(${p.x}px, ${p.y}px)`,
          background: 'rgba(244,63,94,0.18)',
          outline: '1px solid rgba(248,113,113,0.38)',
          boxShadow: '0 0 18px rgba(244,63,94,0.16)',
        };

        return <div key={idx} className="absolute" style={style} />;
      })}
    </div>
  );
}
