/**
 * Public URL-based SFX manifest.
 *
 * - points to files in /public so missing files won't break builds
 * - keep the same basenames and you can swap the actual assets later without code changes
 *
 * Format priority (best -> fallback):
 * 1) .ogg (small, great quality, not supported everywhere)
 * 2) .m4a (Safari/iOS friendly)
 * 3) .mp3 (max compatibility)
 */
export const SFX_SOURCES = {
  bombExplosion: [
    '/audio/sfx/items/bomb/bomb_laserSFX.ogg',
    '/audio/sfx/items/bomb/bomb_laserSFX.m4a',
    '/audio/sfx/items/bomb/bomb_laserSFX.mp3',
  ],
} as const;

export type SfxId = keyof typeof SFX_SOURCES;

/**
 * “Critical” SFX that should be warmed up ASAP in gameplay screens.
 * Add more over time.
 */
export const CORE_SFX: readonly SfxId[] = ['bombExplosion'] as const;
