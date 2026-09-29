import type { UserProfile, Powers } from '@/types';
import { RequestError } from './transport.ts';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
export function readPowers(value: unknown): Powers {
  if (!record(value) || !['bomb', 'laser', 'extraShuffle'].every((k) => count(value[k]))) throw new RequestError('protocol');
  return { bomb: Number(value.bomb), laser: Number(value.laser), extraShuffle: Number(value.extraShuffle) };
}
export function readLegacyProfile(value: unknown): UserProfile {
  if (
    !record(value) ||
    typeof value.username !== 'string' ||
    typeof value.avatar !== 'string' ||
    !record(value.progress) ||
    !Array.isArray(value.badges) ||
    !count(value.playerExp) ||
    !count(value.playerLevel) ||
    Number(value.playerLevel) < 1
  )
    throw new RequestError('protocol');
  readPowers(value.powers);
  if (!Object.entries(value.progress).every(([k, v]) => /^stage([1-9]|1[0-2])$/.test(k) && record(v) && typeof v.completed === 'boolean'))
    throw new RequestError('protocol');
  return value as unknown as UserProfile;
}
