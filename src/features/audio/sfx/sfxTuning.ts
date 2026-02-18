import type { SfxId } from './sfxManifest';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Single knob for item-related SFX loudness.
 * - Set smaller to reduce all item sounds.
 * - Set to 0 to mute item sounds completely.
 */
export const ITEM_SFX_MASTER = 0.05; //0.35

/**
 * Item-related SFX IDs that should be controlled by ITEM_SFX_MASTER.
 * (Extend this list if you add new item SFX in the manifest.)
 */
export const ITEM_SFX_IDS: readonly SfxId[] = ['bombExplosion', 'laserRow', 'laserTargeting', 'laserConfirm', 'reshuffle'] as const;

const ITEM_SFX_SET = new Set<SfxId>(ITEM_SFX_IDS);

/**
 * Optional per-id multipliers (applied AFTER ITEM_SFX_MASTER).
 * Use this only if you want to fine-tune a specific sound.
 */
export const SFX_VOLUME_MULTIPLIERS: Readonly<Partial<Record<SfxId, number>>> = {
  bombExplosion: 1,
  laserRow: 1,
  laserTargeting: 1,
  laserConfirm: 1,
  reshuffle: 1,
};

export function getSfxVolumeMultiplier(id: SfxId): number {
  const master = ITEM_SFX_SET.has(id) ? clamp01(ITEM_SFX_MASTER) : 1;
  const byId = clamp01(SFX_VOLUME_MULTIPLIERS[id] ?? 1);
  return clamp01(master * byId);
}
