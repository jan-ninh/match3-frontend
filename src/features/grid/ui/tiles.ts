import type { PieceType } from '@/gamelogic';

export type TileSprite = {
  sheet: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sheetW: number;
  sheetH: number;
};

type AtlasFrame = {
  frame: { x: number; y: number; w: number; h: number };
  rotated?: boolean;
  trimmed?: boolean;
};

type AtlasJson = {
  frames: Record<string, AtlasFrame>;
  meta: { size: { w: number; h: number } };
};

type TilesetJson = {
  id?: string;
  version?: number;
  pieces: Record<PieceType, string>;
  specials: {
    gateClosed: string;
    gateOpen: string;
    firewall: string;
  };
};

type JsonModule<T> = { default: T };

type LoadedTileset = {
  id: string;
  atlasUrl: string;
  atlas: AtlasJson;
  spec: TilesetJson;
};

const DEFAULT_TILESET_ID = '00-default';

const PIECE_TYPES: PieceType[] = ['red', 'blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];
const SPECIAL_KEYS = ['gateClosed', 'gateOpen', 'firewall'] as const;

function tilesetIdFromPath(p: string): string {
  const marker = '/src/assets/tiles/';
  const i = p.indexOf(marker);
  if (i < 0) return '';
  const rest = p.slice(i + marker.length);
  return rest.split('/')[0] ?? '';
}

function buildIndex(): Record<string, LoadedTileset> {
  const atlasUrls = import.meta.glob('/src/assets/tiles/*/atlas.png', { eager: true, import: 'default' }) as Record<string, string>;
  const atlasJsons = import.meta.glob('/src/assets/tiles/*/atlas.json', { eager: true }) as Record<string, JsonModule<AtlasJson>>;
  const tilesetJsons = import.meta.glob('/src/assets/tiles/*/tileset.json', { eager: true }) as Record<string, JsonModule<TilesetJson>>;

  const idx: Record<string, LoadedTileset> = {};

  for (const [path, url] of Object.entries(atlasUrls)) {
    const id = tilesetIdFromPath(path);
    if (!id) continue;

    const atlasPath = `/src/assets/tiles/${id}/atlas.json`;
    const specPath = `/src/assets/tiles/${id}/tileset.json`;

    const atlasMod = atlasJsons[atlasPath];
    const specMod = tilesetJsons[specPath];
    if (!atlasMod?.default || !specMod?.default) continue;

    idx[id] = { id, atlasUrl: url, atlas: atlasMod.default, spec: specMod.default };
  }

  return idx;
}

const INDEX = buildIndex();

function getRequestedTilesetId(): string | null {
  const raw = import.meta.env.VITE_TILESET as string | undefined;
  const v = typeof raw === 'string' ? raw.trim() : '';
  return v ? v : null;
}

function pickTileset(): LoadedTileset | null {
  const requested = getRequestedTilesetId();
  const isDev = import.meta.env.DEV;

  if (requested && !INDEX[requested]) {
    const known = Object.keys(INDEX).sort().join(', ');
    const msg = `Unknown VITE_TILESET "${requested}". Known: ${known || '(none)'}`;
    if (isDev) throw new Error(msg);
    console.warn(msg);
  }

  const id = requested && INDEX[requested] ? requested : DEFAULT_TILESET_ID;
  const ts = INDEX[id] ?? null;

  if (!ts) {
    const known = Object.keys(INDEX).sort().join(', ');
    const msg = `Missing tileset "${id}". Known: ${known || '(none)'}`;
    if (isDev) throw new Error(msg);
    console.warn(msg);
  }

  return ts;
}

function failOrWarn(msg: string): void {
  if (import.meta.env.DEV) throw new Error(msg);
  console.warn(msg);
}

function validateAtlas(atlas: AtlasJson): void {
  if (!atlas?.frames || !atlas?.meta?.size) {
    failOrWarn('Invalid atlas.json: expected { frames, meta.size }.');
    return;
  }

  for (const [k, v] of Object.entries(atlas.frames)) {
    if (v.rotated || v.trimmed) {
      failOrWarn(`Unsupported atlas frame "${k}": rotated/trimmed not supported (must be false).`);
      return;
    }
  }
}

function validateTileset(ts: LoadedTileset): void {
  validateAtlas(ts.atlas);

  for (const t of PIECE_TYPES) {
    const frameKey = ts.spec?.pieces?.[t];
    if (!frameKey) failOrWarn(`tileset.json missing pieces.${t} in tileset "${ts.id}".`);
    if (frameKey && !ts.atlas.frames[frameKey]) failOrWarn(`tileset "${ts.id}": frame "${frameKey}" not found in atlas (pieces.${t}).`);
  }

  for (const k of SPECIAL_KEYS) {
    const frameKey = ts.spec?.specials?.[k];
    if (!frameKey) failOrWarn(`tileset.json missing specials.${k} in tileset "${ts.id}".`);
    if (frameKey && !ts.atlas.frames[frameKey]) failOrWarn(`tileset "${ts.id}": frame "${frameKey}" not found in atlas (specials.${k}).`);
  }
}

const ACTIVE = pickTileset();
if (ACTIVE) validateTileset(ACTIVE);

export function getActiveTilesetId(): string | null {
  return ACTIVE?.id ?? null;
}

function frameToSprite(frameKey: string): TileSprite | null {
  if (!ACTIVE) return null;

  const f = ACTIVE.atlas.frames?.[frameKey];
  const size = ACTIVE.atlas.meta?.size;
  if (!f || !size) return null;

  return {
    sheet: ACTIVE.atlasUrl,
    x: f.frame.x,
    y: f.frame.y,
    w: f.frame.w,
    h: f.frame.h,
    sheetW: size.w,
    sheetH: size.h,
  };
}

export function getTileSprite(type: PieceType): TileSprite | null {
  if (!ACTIVE) return null;

  const frameKey = ACTIVE.spec?.pieces?.[type];
  if (!frameKey) return null;

  return frameToSprite(frameKey);
}

export function getGateSprite(open: boolean): TileSprite | null {
  if (!ACTIVE) return null;

  const frameKey = open ? ACTIVE.spec?.specials?.gateOpen : ACTIVE.spec?.specials?.gateClosed;
  if (!frameKey) return null;

  return frameToSprite(frameKey);
}

export function getFirewallSprite(): TileSprite | null {
  if (!ACTIVE) return null;

  const frameKey = ACTIVE.spec?.specials?.firewall;
  if (!frameKey) return null;

  return frameToSprite(frameKey);
}

export function preloadTiles(): void {
  if (!ACTIVE) return;

  const img = new Image();
  img.src = ACTIVE.atlasUrl;
}
