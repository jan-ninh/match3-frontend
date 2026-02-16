// src/features/audio/sfx/sfxManifest.ts
/**
 * Public URL-based SFX manifest.
 * - points to files in /public so missing files won't break builds
 * - you can drop multiple formats for max compatibility (mp3 + ogg + m4a)
 *
 * Loader tries in order until one works (404 or unsupported codec => fallback).
 */
export const SFX_URLS = {
  bombExplosion: ['/audio/sfx/items/bomb/bomb_laserSFX.mp3', '/audio/sfx/items/bomb/bomb_laserSFX.ogg', '/audio/sfx/items/bomb/bomb_laserSFX.m4a'],
  reshuffle: ['/audio/sfx/items/reshuffle/reshuffle.mp3', '/audio/sfx/items/reshuffle/reshuffle_SFX.ogg', '/audio/sfx/items/reshuffle/reshuffle_SFX.wav'],

  // UI
  // TEMP: maps to an existing SFX so hover works immediately.
  // Replace with e.g. /audio/sfx/ui/settings_hover_01.* once you add the real asset.
  uiSettingsHover: ['/audio/sfx/matches/match3_pop_02.mp3', '/audio/sfx/ui/settings_hover_01.ogg', '/audio/sfx/ui/settings_hover_01.wav'],

  // Match 3+ pops (randomized by the caller for variation)
  matchPop01: ['/audio/sfx/matches/match3_pop_01.mp3', '/audio/sfx/matches/match3_pop_01.ogg', '/audio/sfx/matches/match3_pop_01.wav'],
  matchPop02: ['/audio/sfx/matches/match3_pop_02.mp3', '/audio/sfx/matches/match3_pop_02.ogg', '/audio/sfx/matches/match3_pop_02.wav'],

  // Objective hit “stinger” (randomized by the caller)
  // NOTE: GOAL PIN lists match_objective_01 twice; keep both entries mapped to the same file for now.
  matchObjective01: ['/audio/sfx/matches/match_objective_01.mp3', '/audio/sfx/matches/match_objective_01.ogg', '/audio/sfx/matches/match_objective_01.wav'],
  matchObjective02: ['/audio/sfx/matches/match_objective_01.mp3', '/audio/sfx/matches/match_objective_01.ogg', '/audio/sfx/matches/match_objective_01.wav'],
} as const;

export type SfxId = keyof typeof SFX_URLS;

// Optional alias (helps readability in other modules)
export const SFX_SOURCES = SFX_URLS;

// Single Source of Truth: "critical" SFX you want warmed up ASAP.
export const CORE_SFX: readonly SfxId[] = [
  'bombExplosion',
  'reshuffle',
  'uiSettingsHover',
  'matchPop01',
  'matchPop02',
  'matchObjective01',
  'matchObjective02',
] as const;
