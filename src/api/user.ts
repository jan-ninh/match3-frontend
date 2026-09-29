import { readLegacyProfile } from './profileShape';
// api/user.ts
import { request } from './http';
import type { UserProfile, Powers } from '@/types';

export async function apiProfile(id: string, signal?: AbortSignal): Promise<UserProfile> {
  const value = await request(`/api/user/profile/${id}`, {
    method: 'GET',
    signal,
  });
  return readLegacyProfile(value);
}

export async function apiUpdateAvatar(
  id: string,
  avatar: 'default.png' | 'avatar1.png' | 'avatar2.png' | 'avatar3.png' | 'avatar4.png' | 'avatar5.png' | 'avatar6.png',
) {
  return request(`/api/user/avatar/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ avatar }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function apiUpdatePowers(id: string, powers: Partial<Powers>, operation: 'set' | 'add' = 'set') {
  return request(`/api/user/powers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ powers, operation }),
    headers: { 'Content-Type': 'application/json' },
  });
}
