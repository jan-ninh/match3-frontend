import type { UserProfile, Powers } from '@/types';
import { RequestError } from './transport.ts';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
export function readPowers(value: unknown): Powers {
  if (!record(value) || !['bomb', 'laser', 'extraShuffle'].every((k) => count(value[k]))) throw new RequestError('protocol');
  return { bomb: Number(value.bomb), laser: Number(value.laser), extraShuffle: Number(value.extraShuffle) };
}
export type CurrentUser = UserProfile & { id: string; email: string; hearts: number };
export function readCurrentUser(value: unknown): CurrentUser {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(value.id) ||
    typeof value.email !== 'string' ||
    !count(value.hearts) ||
    typeof value.username !== 'string' ||
    typeof value.avatar !== 'string' ||
    !['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png', 'avatar5.png', 'avatar6.png'].includes(value.avatar) ||
    !['hearts', 'totalScore', 'gamesPlayed', 'gamesWon', 'gamesLost'].every((k) => count(value[k])) ||
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
  return value as unknown as CurrentUser;
}
