import { accountSession } from './http';
import type { UserProfile } from '@/types';
export function apiUpdateAvatar(ownerId: string, avatar: UserProfile['avatar']) {
  return accountSession.ownerRequest(ownerId, '/api/user/avatar', { method: 'PATCH', body: JSON.stringify({ avatar }) });
}
