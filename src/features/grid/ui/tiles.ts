import type { PieceType } from '@/gamelogic';

import tileBlue from '@/assets/tiles/tile_basic_blue.svg';
import tileGreen from '@/assets/tiles/tile_basic_green.svg';
import tileOrange from '@/assets/tiles/tile_basic_orange.svg';
import tilePurple from '@/assets/tiles/tile_basic_purple.svg';
import tileRed from '@/assets/tiles/tile_basic_red.svg';
import tileYellow from '@/assets/tiles/tile_basic_yellow.svg';

export const TILE_SRC_BY_TYPE: Record<PieceType, string> = {
  blue: tileBlue,
  green: tileGreen,
  orange: tileOrange,
  purple: tilePurple,
  red: tileRed,
  yellow: tileYellow,
};

export const ALL_TILE_SRCS = Object.values(TILE_SRC_BY_TYPE);

export function getTileSrc(type: PieceType): string {
  return TILE_SRC_BY_TYPE[type];
}

export function preloadTiles(): void {
  for (const src of ALL_TILE_SRCS) {
    const img = new Image();
    img.src = src;
  }
}
