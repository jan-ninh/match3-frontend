// src/features/audio/sfx/sfxTuning.ts
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
export const ITEM_SFX_MASTER = 0.85; // 0..1

/**
 * Item-related SFX IDs that should be controlled by ITEM_SFX_MASTER.
 * (Extend this list if you add new item SFX in the manifest.)
 */
export const ITEM_SFX_IDS: readonly SfxId[] = ['bombExplosion', 'laserRow', 'laserTargeting', 'laserConfirm', 'reshuffle'] as const;

const ITEM_SFX_SET = new Set<SfxId>(ITEM_SFX_IDS);

/**
 * Single knob for match-related SFX loudness (pops + reward stingers).
 * - Set smaller to reduce all match sounds.
 * - Set to 0 to mute match sounds completely.
 *
 * Default = 1 so existing behavior doesn't change.
 */
export const MATCH_SFX_MASTER = 1; // 0..1

export const MATCH_SFX_IDS: readonly SfxId[] = [
  'matchPop01',
  'matchPop02',
  'match4Chime',
  'match5Sting',
  'matchObjective01',
  'matchObjective02',
] as const;

const MATCH_SFX_SET = new Set<SfxId>(MATCH_SFX_IDS);

/**
 * Optional per-id multipliers (applied AFTER the group master).
 * Use this only if you want to fine-tune a specific sound.
 */
export const SFX_VOLUME_MULTIPLIERS: Readonly<Partial<Record<SfxId, number>>> = {
  // items
  bombExplosion: 1,
  laserRow: 0.5,
  laserTargeting: 1,
  laserConfirm: 1,
  reshuffle: 1,

  // matches
  matchPop01: 1,
  matchPop02: 1,
  match4Chime: 1,
  match5Sting: 1,
  matchObjective01: 1,
  matchObjective02: 1,
};

export function getSfxVolumeMultiplier(id: SfxId): number {
  const group =
    ITEM_SFX_SET.has(id) ? clamp01(ITEM_SFX_MASTER) : MATCH_SFX_SET.has(id) ? clamp01(MATCH_SFX_MASTER) : 1;

  const byId = clamp01(SFX_VOLUME_MULTIPLIERS[id] ?? 1);
  return clamp01(group * byId);
}
