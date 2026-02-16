import type { CSSProperties } from 'react';

import type { TileSprite } from '../../tilesSpecial';
import { TILE_SIZE } from '../../../lib/constants';

export function spriteToBgStyle(sprite: TileSprite | null): CSSProperties | undefined {
  if (!sprite) return undefined;

  const scale = TILE_SIZE / sprite.w;
  return {
    backgroundImage: `url(${sprite.sheet})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sprite.sheetW * scale}px ${sprite.sheetH * scale}px`,
    backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
  };
}
