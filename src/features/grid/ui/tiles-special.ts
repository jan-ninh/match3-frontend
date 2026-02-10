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

  // optional: reuse the same "basics + palettes" mapping style as normal tilesets
  basics?: Record<string, string>;
  palettes?: Record<string, Partial<Record<string, string>>>;
  defaultPalette?: string;
  levelPalettes?: Record<string, string>;

  // specials map "specialKey" -> (basicId OR frameKey)
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

// Primary: special tiles live under /assets/tiles/special/<ID>/*
const tilesetMods = import.meta.glob('../../../assets/tiles/special/*/tileset.json', { eager: true, import: 'default' }) as Record<string, TilesetJson>;
const atlasMods = import.meta.glob('../../../assets/tiles/special/*/atlas.json', { eager: true, import: 'default' }) as Record<string, AtlasJson>;
const sheetMods = import.meta.glob('../../../assets/tiles/special/*/atlas*.png', { eager: true, import: 'default' }) as Record<string, string>;

// Compatibility fallback (migration): if /special has no tilesets yet, allow reading specials from normal tilesets.
const fallbackTilesetMods = import.meta.glob('../../../assets/tiles/default/*/tileset.json', { eager: true, import: 'default' }) as Record<string, TilesetJson>;
const fallbackAtlasMods = import.meta.glob('../../../assets/tiles/default/*/atlas.json', { eager: true, import: 'default' }) as Record<string, AtlasJson>;
const fallbackSheetMods = import.meta.glob('../../../assets/tiles/default/*/atlas*.png', { eager: true, import: 'default' }) as Record<string, string>;

function extractTilesetId(path: string, rootKey: string): string | null {
  const i = path.lastIndexOf(rootKey);
  if (i < 0) return null;

  const rest = path.slice(i + rootKey.length); // "{id}/tileset.json"
  const slash = rest.indexOf('/');
  if (slash < 0) return null;

  return rest.slice(0, slash);
}

function pickSheetPathForTileset(tilesetPath: string, atlas: AtlasJson, sheetMap: Record<string, string>): string | null {
  const desired = atlas.meta?.image?.trim();

  // 1) Best case: atlas.json says exactly which png to use.
  if (desired) {
    const p = tilesetPath.replace('tileset.json', desired);
    if (sheetMap[p]) return p;
  }

  // 2) Fallback: pick the first atlas*.png in the same folder (deterministic)
  const folder = tilesetPath.slice(0, tilesetPath.lastIndexOf('/'));
  const candidates = Object.keys(sheetMap)
    .filter((k) => k.startsWith(folder + '/'))
    .sort();

  return candidates[0] ?? null;
}

function buildTilesetsById(args: {
  tilesetMods: Record<string, TilesetJson>;
  atlasMods: Record<string, AtlasJson>;
  sheetMods: Record<string, string>;
  rootKey: string; // e.g. "/assets/tiles/special/"
  label: string; // for error messages
}): Record<string, LoadedTileset> {
  const { tilesetMods: tmods, atlasMods: amods, sheetMods: smods, rootKey, label } = args;

  const out: Record<string, LoadedTileset> = {};

  for (const [tilesetPath, cfg] of Object.entries(tmods)) {
    const id = extractTilesetId(tilesetPath, rootKey);
    if (!id) continue;

    const atlasPath = tilesetPath.replace('tileset.json', 'atlas.json');
    const atlas = amods[atlasPath];

    const sheetPath = atlas ? pickSheetPathForTileset(tilesetPath, atlas, smods) : null;
    const sheetUrl = sheetPath ? smods[sheetPath] : undefined;

    if (!atlas || !sheetUrl) {
      if (import.meta.env.DEV) {
        throw new Error(
          `${label} tileset "${id}" missing atlas.json or atlas*.png (expected: ${atlasPath}, ${tilesetPath.replace('tileset.json', 'atlas*.png')})`,
        );
      }
      continue;
    }

    out[id] = { id, cfg, atlas, sheetUrl };
  }

  return out;
}

const SPECIAL_TILESETS_BY_ID = buildTilesetsById({
  tilesetMods,
  atlasMods,
  sheetMods,
  rootKey: '/assets/tiles/special/',
  label: 'Special',
});

const FALLBACK_TILESETS_BY_ID = buildTilesetsById({
  tilesetMods: fallbackTilesetMods,
  atlasMods: fallbackAtlasMods,
  sheetMods: fallbackSheetMods,
  rootKey: '/assets/tiles/',
  label: 'Fallback special',
});

function usingFallback(): boolean {
  return Object.keys(SPECIAL_TILESETS_BY_ID).length === 0;
}

function getTilesets(): Record<string, LoadedTileset> {
  return usingFallback() ? FALLBACK_TILESETS_BY_ID : SPECIAL_TILESETS_BY_ID;
}

function pickDefaultTilesetId(map: Record<string, LoadedTileset>): string | null {
  const ids = Object.keys(map).sort();
  if (!ids.length) return null;

  const envId = envStr(readEnv('VITE_SPECIAL_TILESET_FOLDER'));
  if (envId && map[envId]) return envId;

  // convenience fallback: if special env not set, reuse the normal tileset id if possible
  const envNormal = envStr(readEnv('VITE_TILESET_FOLDER'));
  if (envNormal && map[envNormal]) return envNormal;

  return ids[0] ?? null;
}

let activeTilesetId: string | null = pickDefaultTilesetId(getTilesets());
let currentLevelId: number | null = null;

// manual override (dev): if set, it wins over env/level/default
let manualPaletteName: string | null = null;

function getActive(): LoadedTileset | null {
  const map = getTilesets();
  if (!activeTilesetId) return null;

  if (map[activeTilesetId]) return map[activeTilesetId] ?? null;

  // if the current id doesn't exist in the chosen map, re-pick a default
  activeTilesetId = pickDefaultTilesetId(map);
  if (!activeTilesetId) return null;
  return map[activeTilesetId] ?? null;
}

function resolvePaletteName(cfg: TilesetJson): string | null {
  if (manualPaletteName) return manualPaletteName;

  const envPalette = envStr(readEnv('VITE_SPECIAL_TILE_PALETTE'));
  if (envPalette && cfg.palettes?.[envPalette]) return envPalette;

  // convenience fallback: reuse normal palette key
  const envNormal = envStr(readEnv('VITE_TILE_PALETTE'));
  if (envNormal && cfg.palettes?.[envNormal]) return envNormal;

  if (currentLevelId !== null) {
    const byLevel = cfg.levelPalettes?.[String(currentLevelId)];
    if (byLevel && cfg.palettes?.[byLevel]) return byLevel;
  }

  const def = cfg.defaultPalette;
  if (def && cfg.palettes?.[def]) return def;

  return null;
}

function resolveFrameKeyFromValue(cfg: TilesetJson, v: string): string {
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

function getFrameKeyForSpecial(cfg: TilesetJson, key: string): string | null {
  // optional palette indirection (if you want special sprites to change per palette)
  const paletteName = resolvePaletteName(cfg);
  if (paletteName) {
    const palette = cfg.palettes?.[paletteName];
    const pv = palette?.[key];
    if (pv) return resolveFrameKeyFromValue(cfg, pv);
  }

  // allow using basicIds directly (e.g. "b-04")
  if (cfg.basics?.[key]) return resolveFrameKeyFromValue(cfg, key);

  const v = cfg.specials?.[key];
  if (!v) return null;

  return resolveFrameKeyFromValue(cfg, v);
}

export function setSpecialTilesetId(id: string | null): void {
  const map = getTilesets();
  if (id && map[id]) {
    activeTilesetId = id;
  } else {
    activeTilesetId = pickDefaultTilesetId(map);
  }
  manualPaletteName = null;
}

export function setSpecialTilesetLevel(levelId: number): void {
  currentLevelId = levelId;
}

export function clearManualSpecialTilesetPalette(): void {
  manualPaletteName = null;
}

export function getAvailableSpecialPalettes(): string[] {
  const t = getActive();
  const names = Object.keys(t?.cfg.palettes ?? {});
  names.sort();
  return names;
}

export function cycleSpecialTilesetPalette(): string | null {
  const t = getActive();
  if (!t) return null;

  const names = getAvailableSpecialPalettes();
  if (!names.length) return null;

  const current = resolvePaletteName(t.cfg) ?? '';
  const idx = Math.max(-1, names.indexOf(current));
  const next = names[(idx + 1) % names.length] ?? names[0]!;
  manualPaletteName = next;

  return next;
}

export function getSpecialTilesetRuntimeInfo(): { tilesetId: string | null; palette: string | null; paletteMode: 'auto' | 'manual'; fallback: boolean } {
  const t = getActive();
  if (!t) return { tilesetId: null, palette: null, paletteMode: 'auto', fallback: usingFallback() };

  const palette = resolvePaletteName(t.cfg);
  return { tilesetId: t.id, palette, paletteMode: manualPaletteName ? 'manual' : 'auto', fallback: usingFallback() };
}

export function getSpecialTileSprite(key: string): TileSprite | null {
  const t = getActive();
  if (!t) return null;

  const frameKey = getFrameKeyForSpecial(t.cfg, key);

  if (!frameKey) {
    // DEV hard-fail only when we are *not* in fallback mode (i.e. you created /special on purpose)
    if (import.meta.env.DEV && !usingFallback()) {
      throw new Error(`Special tileset "${t.id}" missing mapping for key "${key}"`);
    }
    return null;
  }

  const sprite = frameToSprite(t.sheetUrl, t.atlas, frameKey);

  if (!sprite && import.meta.env.DEV && !usingFallback()) {
    throw new Error(`Special tileset "${t.id}" missing atlas frame "${frameKey}" for key "${key}"`);
  }

  return sprite;
}

export function getGateSprite(open: boolean): TileSprite | null {
  return getSpecialTileSprite(open ? 'gateOpen' : 'gateClosed');
}

export function preloadSpecialTiles(): void {
  const t = getActive();
  if (!t) return;

  const img = new Image();
  img.src = t.sheetUrl;
}

export const specialTile_01 = 'b-01' as const;
export const specialTile_02 = 'b-02' as const;
export const specialTile_03 = 'b-03' as const;
export const specialTile_04 = 'b-04' as const;
export const specialTile_05 = 'b-05' as const;
export const specialTile_06 = 'b-06' as const;
export const specialTile_07 = 'b-07' as const;
export const specialTile_08 = 'b-08' as const;
export const specialTile_09 = 'b-09' as const;
export const specialTile_10 = 'b-10' as const;
