/**
 * Public URL-based SFX manifest.
 * - points to files in /public so missing files won't break builds
 * - you can drop multiple formats for max compatibility (mp3 + ogg + m4a)
 *
 * Loader tries in order until one works (404 or unsupported codec => fallback).
 */
export const SFX_URLS = {
  bombExplosion: ['/audio/sfx/items/bomb/bomb_laserSFX.mp3', '/audio/sfx/items/bomb/bomb_laserSFX.ogg', '/audio/sfx/items/bomb/bomb_laserSFX.m4a'],
  reshuffle: ['/audio/sfx/items/reshuffle/reshuffle_SFX.mp3', '/audio/sfx/items/reshuffle/reshuffle_SFX.ogg', '/audio/sfx/items/reshuffle/reshuffle_SFX.wav'],
} as const;

export type SfxId = keyof typeof SFX_URLS;

// Optional alias (helps readability in other modules)
export const SFX_SOURCES = SFX_URLS;

// Single Source of Truth: "critical" SFX you want warmed up ASAP.
export const CORE_SFX: readonly SfxId[] = ['bombExplosion', 'reshuffle'] as const;
