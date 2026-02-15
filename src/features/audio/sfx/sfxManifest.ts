// src/features/audio/sfx/sfxManifest.ts
/**
 * Public URL-based SFX manifest.
 * - points to files in /public so missing files won't break builds
 * - replace the file later without touching code (keep same filename)
 */
export const SFX_URLS = {
  bombExplosion: '/audio/sfx/items/bomb/bomb_laserSFX.mp3',
} as const;

export type SfxId = keyof typeof SFX_URLS;
