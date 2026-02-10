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

  // Legacy (still supported): direct PieceType -> frameKey
  pieces?: Record<PieceType, string>;

  // Specials (frameKey OR basicId)
  specials?: Record<string, string>;
};

type LoadedTileset = {
  id: string;
  cfg: TilesetJson;
  atlas: AtlasJson;
  sheetUrl: string;
};

function envStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function readEnv(key: string): unknown {
  // avoid explicit `any`, but still allow custom VITE_* keys without d.ts augmentation
  const env = import.meta.env as unknown as Record<string, unknown>;
  return env[key];
}

const tilesetMods = import.meta.glob('../../../assets/tiles/*/tileset.json', { eager: true, import: 'default' }) as Record<string, TilesetJson>;
const atlasMods = import.meta.glob('../../../assets/tiles/*/atlas.json', { eager: true, import: 'default' }) as Record<string, AtlasJson>;
const sheetMods = import.meta.glob('../../../assets/tiles/*/atlas*.png', { eager: true, import: 'default' }) as Record<string, string>;

// ID wird aus dem PFAD geschnitten (Ordnername: 01-default)
function extractTilesetId(path: string): string | null {
  const key = '/assets/tiles/';
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

function pickDefaultTilesetId(): string | null {
  const ids = Object.keys(TILESETS_BY_ID).sort();
  if (!ids.length) return null;

  const envId = envStr(readEnv('VITE_TILESET_FOLDER'));
  if (envId && TILESETS_BY_ID[envId]) return envId;

  return ids[0] ?? null;
}

let activeTilesetId: string | null = pickDefaultTilesetId();
let currentLevelId: number | null = null;

// manual override (dev): if set, it wins over env/level/default
let manualPaletteName: string | null = null;

const SIX_CORE_TYPE_ORDER: PieceType[] = ['red', 'blue', 'green', 'purple', 'cyan', 'yellow'];
const SIX_CORE_SLOT_KEYS = ['01', '02', '03', '04', '05', '06'] as const;

function slotKeyForSixCoreType(type: PieceType): (typeof SIX_CORE_SLOT_KEYS)[number] | null {
  const i = SIX_CORE_TYPE_ORDER.indexOf(type);
  return i >= 0 ? SIX_CORE_SLOT_KEYS[i] : null;
}

function getActive(): LoadedTileset | null {
  if (!activeTilesetId) return null;
  return TILESETS_BY_ID[activeTilesetId] ?? null;
}

function resolvePaletteName(cfg: TilesetJson): string | null {
  if (manualPaletteName) return manualPaletteName;

  const envPalette = envStr(readEnv('VITE_TILE_PALETTE'));
  if (envPalette && cfg.palettes?.[envPalette]) return envPalette;

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

function getFrameKeyForSpecial(cfg: TilesetJson, key: string): string | null {
  const v = cfg.specials?.[key];
  if (!v) return null;
  return resolveFrameKeyFromPaletteValue(cfg, v);
}

export function setTilesetId(id: string | null): void {
  if (id && TILESETS_BY_ID[id]) {
    activeTilesetId = id;
  } else {
    activeTilesetId = pickDefaultTilesetId();
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

export function getGateSprite(open: boolean): TileSprite | null {
  const t = getActive();
  if (!t) return null;

  const frameKey = open ? getFrameKeyForSpecial(t.cfg, 'gateOpen') : getFrameKeyForSpecial(t.cfg, 'gateClosed');
  if (!frameKey) return null;

  return frameToSprite(t.sheetUrl, t.atlas, frameKey);
}

export function preloadTiles(): void {
  const t = getActive();
  if (!t) return;

  const img = new Image();
  img.src = t.sheetUrl;
}
