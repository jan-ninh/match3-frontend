import type { PieceType } from '@/gamelogic';

import sheetUrl from '@/assets/tiles/tilepack_sheet.png';
import atlas from '@/assets/tiles/tilepack_sheet.json';

type AtlasJson = typeof atlas;

export type TileSprite = {
  sheet: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
};

const FRAME_W = 256;
const FRAME_H = 256;

const SHEET_W = (atlas as AtlasJson).meta.size.w as number;
const SHEET_H = (atlas as AtlasJson).meta.size.h as number;

const COLS = Math.max(1, Math.round(SHEET_W / FRAME_W));
const ROWS = Math.max(1, Math.round(SHEET_H / FRAME_H));

const FRAME_NAME_BY_TYPE: Record<PieceType, keyof AtlasJson['frames']> = {
  blue: 'tile_blue_diamond.png',
  green: 'tile_green_triangle.png',
  purple: 'tile_purple_square.png',
  orange: 'tile_orange_flame.png',
  cyan: 'tile_cyan_circuit.png',
  pink: 'tile_pink_holo.png',
  yellow: 'tile_yellow_prism.png',
};

function frameToSprite(name: keyof AtlasJson['frames']): TileSprite | null {
  const f = (atlas as AtlasJson).frames[name];
  if (!f) return null;

  const x = f.frame.x;
  const y = f.frame.y;

  const col = Math.floor(x / FRAME_W);
  const row = Math.floor(y / FRAME_H);

  return { sheet: sheetUrl, col, row, cols: COLS, rows: ROWS };
}

export function getTileSprite(type: PieceType): TileSprite | null {
  return frameToSprite(FRAME_NAME_BY_TYPE[type]);
}

export function getGateSprite(open: boolean): TileSprite | null {
  return frameToSprite((open ? 'neon_gate_open.png' : 'neon_gate_closed.png') as keyof AtlasJson['frames']);
}

export function preloadTiles(): void {
  const img = new Image();
  img.src = sheetUrl;
}

