/**
 * Public URL-based SFX manifest.
 * - points to files in /public so missing files won't break builds
 * - you can drop multiple formats for max compatibility (mp3 + ogg + m4a)
 *
 * Loader tries in order until one works (404 or unsupported codec => fallback).
 *
 * IMPORTANT: URLs must respect Vite's BASE_URL so deployments under a sub-path work.
 * (Using leading '/' would bypass BASE_URL and 404 on e.g. '/myapp/'.)
 */

function withBase(path: string): string {
  // Vite guarantees BASE_URL to end with '/' (e.g. '/', '/myapp/').
  const base = import.meta.env.BASE_URL ?? '/';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}

function urls(...paths: readonly string[]): readonly string[] {
  return paths.map(withBase);
}

export const SFX_URLS = {
  // Items
  bombExplosion: urls(
    'audio/sfx/items/bomb/bomb_laserSFX.mp3',
    'audio/sfx/items/bomb/bomb_laserSFX.ogg',
    'audio/sfx/items/bomb/bomb_laserSFX.m4a',
  ),

  // Laser (Row-Clear Item)
  // Expected asset location (public/): public/audio/sfx/items/laser/laser.mp3
  laserRow: urls('audio/sfx/items/laser/laser.mp3', 'audio/sfx/items/laser/laser.ogg', 'audio/sfx/items/laser/laser.m4a'),

  reshuffle: urls('audio/sfx/items/reshuffle/reshuffle.mp3', 'audio/sfx/items/reshuffle/reshuffle_SFX.ogg', 'audio/sfx/items/reshuffle/reshuffle_SFX.wav'),

  // UI
  // TEMP: maps to an existing SFX so hover works immediately.
  // Replace with e.g. audio/sfx/ui/settings_hover_01.* once you add the real asset.
  uiSettingsHover: urls('audio/sfx/matches/match3_pop_02.mp3', 'audio/sfx/ui/settings_hover_01.ogg', 'audio/sfx/ui/settings_hover_01.wav'),

  // Match 3+ pops (randomized by the caller for variation)
  matchPop01: urls('audio/sfx/matches/match3_pop_01.mp3', 'audio/sfx/matches/match3_pop_01.ogg', 'audio/sfx/matches/match3_pop_01.wav'),
  matchPop02: urls('audio/sfx/matches/match3_pop_02.mp3', 'audio/sfx/matches/match3_pop_02.ogg', 'audio/sfx/matches/match3_pop_02.wav'),

  // Objective hit “stinger” (randomized by the caller)
  // NOTE: GOAL PIN lists match_objective_01 twice; keep both entries mapped to the same file for now.
  matchObjective01: urls('audio/sfx/matches/match_objective_01.mp3', 'audio/sfx/matches/match_objective_01.ogg', 'audio/sfx/matches/match_objective_01.wav'),
  matchObjective02: urls('audio/sfx/matches/match_objective_01.mp3', 'audio/sfx/matches/match_objective_01.ogg', 'audio/sfx/matches/match_objective_01.wav'),
} as const;

export type SfxId = keyof typeof SFX_URLS;

// Optional alias (helps readability in other modules)
export const SFX_SOURCES = SFX_URLS;

// Single Source of Truth: "critical" SFX you want warmed up ASAP.
export const CORE_SFX: readonly SfxId[] = [
  'bombExplosion',
  'laserRow',
  'reshuffle',
  'uiSettingsHover',
  'matchPop01',
  'matchPop02',
  'matchObjective01',
  'matchObjective02',
] as const;
