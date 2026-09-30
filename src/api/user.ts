import { accountSession } from './http';
import type { UserProfile, Powers } from '@/types';
export function apiUpdateAvatar(ownerId: string, avatar: UserProfile['avatar']) {
  return accountSession.ownerRequest(ownerId, '/api/user/avatar', { method: 'PATCH', body: JSON.stringify({ avatar }) });
}
export function apiUpdatePowers(ownerId: string, powers: Partial<Powers>, operation: 'set' | 'add' = 'set') {
  return accountSession.ownerRequest(ownerId, '/api/user/powers', { method: 'PATCH', body: JSON.stringify({ powers, operation }) });
}
