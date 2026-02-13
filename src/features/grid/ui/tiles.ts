// src/features/grid/ui/tiles.ts
import type { PieceType } from '@/gamelogic';

export type TileSprite = {
  sheet: string;

  // frame rect in the source atlas (px)
  x: number;
  y: number;
  w: number;
  h: number;

  // atlas sheet size (px)
  sheetW: number;
  sheetH: number;
};

type AtlasJson = {
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number };
      rotated?: boolean;
      trimmed?: boolean;
      spriteSourceSize?: { x: number; y: number; w: number; h: number };
      sourceSize?: { w: number; h: number };
    }
  >;
  meta?: {
    image?: string;
    size?: { w: number; h: number };
    scale?: string;
  };
};

type TilesetJson = {
  id: string;

  // basics maps "basicId" -> "frameKey" (frameKey must exist in atlas.frames)
  basics?: Record<string, string>;

  // palettes map "paletteName" -> (PieceType OR "01".."06") -> (basicId OR frameKey)
  palettes?: Record<string, Partial<Record<string, string>>>;

  defaultPalette?: string;
  levelPalettes?: Record<string, string>;

  // Optional special mappings (e.g. keycard, bombs, etc.)
  specials?: Record<string, string>;

  // Legacy (still supported): direct PieceType -> frameKey
  pieces?: Record<PieceType, string>;
};

type LoadedTileset = {
  id: string;
  cfg: TilesetJson;
  atlas: AtlasJson;
  sheetUrl: string;
};

type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const DEFAULT_TILESET_ID = '01-default' as const;

/**
 * ✅ Per-Level Tileset Folder Selection (Level 1..12)
 *
 * Werte sind Ordnernamen unter: src/assets/tiles/default/<folder>/*
 * Beispiel: '02-neon-dark'
 *
 * Fallback-Regel:
 * - Wenn hier ein Ordner NICHT existiert oder leer ist: DEFAULT_TILESET_ID ('01-default')
 * - Wenn auch DEFAULT nicht existiert: erster gefundener Tileset-Ordner (sorted)
 */
const LEVEL_TILESET_FOLDER_BY_LEVEL: Record<LevelId, string> = {
  1: '01-default',
  2: '02-default',
  3: '03-default',
  4: '04-default',
  5: '05-default',
  6: '01-default',
  7: '01-default',
  8: '01-default',
  9: '01-default',
  10: '01-default',
  11: '01-default',
  12: '01-default',
};

const tilesetMods = import.meta.glob('../../../assets/tiles/default/*/tileset.json', { eager: true, import: 'default' }) as Record<string, TilesetJson>;
const atlasMods = import.meta.glob('../../../assets/tiles/default/*/atlas.json', { eager: true, import: 'default' }) as Record<string, AtlasJson>;
const sheetMods = import.meta.glob('../../../assets/tiles/default/*/atlas*.png', { eager: true, import: 'default' }) as Record<string, string>;

// ID wird aus dem PFAD geschnitten (Ordnername: 01-default)
function extractTilesetId(path: string): string | null {
  const key = '/assets/tiles/default/';
  const i = path.lastIndexOf(key);
  if (i < 0) return null;

  const rest = path.slice(i + key.length); // "{id}/tileset.json"
  const slash = rest.indexOf('/');
  if (slash < 0) return null;

  return rest.slice(0, slash);
}

function pickSheetPathForTileset(tilesetPath: string, atlas: AtlasJson): string | null {
  const desired = atlas.meta?.image?.trim();

  // 1) Best case: atlas.json says exactly which png to use.
  if (desired) {
    const p = tilesetPath.replace('tileset.json', desired);
    if (sheetMods[p]) return p;
  }

  // 2) Fallback: pick the first atlas*.png in the same folder (deterministic)
  const folder = tilesetPath.slice(0, tilesetPath.lastIndexOf('/'));
  const candidates = Object.keys(sheetMods)
    .filter((k) => k.startsWith(folder + '/'))
    .sort();

  return candidates[0] ?? null;
}

const TILESETS_BY_ID: Record<string, LoadedTileset> = {};

for (const [tilesetPath, cfg] of Object.entries(tilesetMods)) {
  const id = extractTilesetId(tilesetPath);
  if (!id) continue;

  const atlasPath = tilesetPath.replace('tileset.json', 'atlas.json');
  const atlas = atlasMods[atlasPath];

  const sheetPath = atlas ? pickSheetPathForTileset(tilesetPath, atlas) : null;
  const sheetUrl = sheetPath ? sheetMods[sheetPath] : undefined;

  if (!atlas || !sheetUrl) {
    if (import.meta.env.DEV) {
      throw new Error(`Tileset "${id}" missing atlas.json or atlas*.png (expected: ${atlasPath}, ${tilesetPath.replace('tileset.json', 'atlas*.png')})`);
    }
    continue;
  }

  TILESETS_BY_ID[id] = { id, cfg, atlas, sheetUrl };
}

function isValidTilesetId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.length > 0 && Boolean(TILESETS_BY_ID[id]);
}

function toLevelId(n: number): LevelId | null {
  if (n >= 1 && n <= 12) return n as LevelId;
  return null;
}

function pickFallbackTilesetId(): string | null {
  if (isValidTilesetId(DEFAULT_TILESET_ID)) return DEFAULT_TILESET_ID;

  const ids = Object.keys(TILESETS_BY_ID).sort();
  return ids[0] ?? null;
}

let currentLevelId: number | null = null;

// manual override (dev): if set, it wins over level/default
let manualTilesetId: string | null = null;
let manualPaletteName: string | null = null;

const SIX_CORE_TYPE_ORDER: PieceType[] = ['red', 'blue', 'green', 'purple', 'cyan', 'yellow'];
const SIX_CORE_SLOT_KEYS = ['01', '02', '03', '04', '05', '06'] as const;

function slotKeyForSixCoreType(type: PieceType): (typeof SIX_CORE_SLOT_KEYS)[number] | null {
  const i = SIX_CORE_TYPE_ORDER.indexOf(type);
  return i >= 0 ? SIX_CORE_SLOT_KEYS[i] : null;
}

function resolveTilesetId(): string | null {
  // 1) manual override
  if (isValidTilesetId(manualTilesetId)) return manualTilesetId;

  // 2) per-level selection
  if (currentLevelId !== null) {
    const lvl = toLevelId(currentLevelId);
    if (lvl) {
      const desired = LEVEL_TILESET_FOLDER_BY_LEVEL[lvl];
      if (isValidTilesetId(desired)) return desired;

      // if desired folder missing/invalid -> fallback to DEFAULT (01-default) if available
      if (isValidTilesetId(DEFAULT_TILESET_ID)) return DEFAULT_TILESET_ID;
    }
  }

  // 3) final fallback
  return pickFallbackTilesetId();
}

function getActive(): LoadedTileset | null {
  const id = resolveTilesetId();
  if (!id) return null;
  return TILESETS_BY_ID[id] ?? null;
}

function resolvePaletteName(cfg: TilesetJson): string | null {
  // manual palette (dev) – only if it exists on this tileset
  if (manualPaletteName && cfg.palettes?.[manualPaletteName]) return manualPaletteName;

  if (currentLevelId !== null) {
    const byLevel = cfg.levelPalettes?.[String(currentLevelId)];
    if (byLevel && cfg.palettes?.[byLevel]) return byLevel;
  }

  const def = cfg.defaultPalette;
  if (def && cfg.palettes?.[def]) return def;

  return null;
}

function resolveFrameKeyFromPaletteValue(cfg: TilesetJson, v: string): string {
  // If "v" is a basicId and exists in basics -> map to frameKey, else assume it's already a frameKey.
  const mapped = cfg.basics?.[v];
  return mapped ?? v;
}

function frameToSprite(sheetUrl: string, atlas: AtlasJson, frameKey: string): TileSprite | null {
  const f = atlas.frames?.[frameKey]?.frame;
  const size = atlas.meta?.size;

  if (!f || !size) return null;

  return {
    sheet: sheetUrl,
    x: f.x,
    y: f.y,
    w: f.w,
    h: f.h,
    sheetW: size.w,
    sheetH: size.h,
  };
}

function getFrameKeyForPieceType(cfg: TilesetJson, type: PieceType): string | null {
  // Keycard special handling (Level 03)
  if (type === 'keycard') {
    // Try specials mapping first
    const specialKey = cfg.specials?.['keycard'];
    if (specialKey) return resolveFrameKeyFromPaletteValue(cfg, specialKey);

    // No sprite configured => Tile.tsx should render its own fallback
    return null;
  }

  const paletteName = resolvePaletteName(cfg);

  if (paletteName) {
    const palette = cfg.palettes?.[paletteName];

    // Mode A: direct PieceType -> (basicId OR frameKey)
    const direct = palette?.[type];
    if (direct) return resolveFrameKeyFromPaletteValue(cfg, direct);

    // Mode B: "six-core slots": "01".."06" -> (basicId OR frameKey)
    const slotKey = slotKeyForSixCoreType(type);
    if (slotKey) {
      const v = palette?.[slotKey];
      if (v) return resolveFrameKeyFromPaletteValue(cfg, v);
    }
  }

  const legacy = cfg.pieces?.[type];
  return legacy ?? null;
}

export function setTilesetId(id: string | null): void {
  // manual override: wins over per-level/default until cleared
  if (isValidTilesetId(id)) {
    manualTilesetId = id;
  } else {
    manualTilesetId = null;
  }
  manualPaletteName = null;
}

export function setTilesetLevel(levelId: number): void {
  currentLevelId = levelId;
}

export function clearManualTilesetPalette(): void {
  manualPaletteName = null;
}

export function getAvailablePalettes(): string[] {
  const t = getActive();
  const names = Object.keys(t?.cfg.palettes ?? {});
  names.sort();
  return names;
}

export function cycleTilesetPalette(): string | null {
  const t = getActive();
  if (!t) return null;

  const names = getAvailablePalettes();
  if (!names.length) return null;

  const current = resolvePaletteName(t.cfg) ?? '';
  const idx = Math.max(-1, names.indexOf(current));
  const next = names[(idx + 1) % names.length] ?? names[0]!;
  manualPaletteName = next;

  return next;
}

export function getTilesetRuntimeInfo(): { tilesetId: string | null; palette: string | null; paletteMode: 'auto' | 'manual' } {
  const t = getActive();
  if (!t) return { tilesetId: null, palette: null, paletteMode: 'auto' };

  const palette = resolvePaletteName(t.cfg);
  return { tilesetId: t.id, palette, paletteMode: manualPaletteName ? 'manual' : 'auto' };
}

export function getTileSprite(type: PieceType): TileSprite | null {
  const t = getActive();
  if (!t) return null;

  const frameKey = getFrameKeyForPieceType(t.cfg, type);
  if (!frameKey) return null;

  return frameToSprite(t.sheetUrl, t.atlas, frameKey);
}

export function preloadTiles(): void {
  const t = getActive();
  if (!t) return;

  const img = new Image();
  img.src = t.sheetUrl;
}
