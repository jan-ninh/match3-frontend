import type { PieceType } from '@/gamelogic';

import canisterBlueUrl from '@/assets/tiles/art-01/canister_blue.png';
import chipGreenUrl from '@/assets/tiles/art-01/chip_green.png';
import coreRedUrl from '@/assets/tiles/art-01/core_red.png';
import crystalPrismUrl from '@/assets/tiles/art-01/crystal_prism.png';
import runePurpleUrl from '@/assets/tiles/art-01/rune_purple.png';
import shardBlueUrl from '@/assets/tiles/art-01/shard_blue.png';
import signExitUrl from '@/assets/tiles/art-01/sign_exit.png';
import core_red from '@/assets/tiles/art-01/core_red.png';

export type TileSprite = {
  sheet: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
};

const SPRITE_1X1 = { col: 0, row: 0, cols: 1, rows: 1 } as const;

// UI-only reskin: keep PieceType as-is, map to new Art-01 PNGs.
const TILE_URL_BY_TYPE: Record<PieceType, string> = {
  red: core_red,
  blue: shardBlueUrl,
  green: chipGreenUrl,
  purple: runePurpleUrl,
  orange: coreRedUrl,
  cyan: crystalPrismUrl,
  pink: canisterBlueUrl,
  yellow: crystalPrismUrl, // duplicate; yellow gets CSS filter in <Tile />
};

function urlToSprite(url: string): TileSprite {
  return { sheet: url, ...SPRITE_1X1 };
}

export function getTileSprite(type: PieceType): TileSprite | null {
  const url = TILE_URL_BY_TYPE[type];
  return url ? urlToSprite(url) : null;
}

// sign_exit stands in for the "neon gate" objective.
export function getGateSprite(open: boolean): TileSprite | null {
  void open;
  return urlToSprite(signExitUrl);
}

export function preloadTiles(): void {
  const urls = [...new Set([...Object.values(TILE_URL_BY_TYPE), signExitUrl])];
  for (const url of urls) {
    const img = new Image();
    img.src = url;
  }
}
