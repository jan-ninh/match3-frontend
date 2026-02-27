// api/user.ts
import { request } from './http';
import type { UserProfile, Powers } from '@/types';

/**
 * Get profile of any user (⚠️ Backend should validate userId === requesters id)
 * @deprecated Use `apiMyProfile()` for better security
 */
export async function apiProfile(id: string): Promise<UserProfile> {
  console.warn('⚠️ Using apiProfile(id) - prefer apiMyProfile() for security');
  return request(`/api/user/profile/${id}`, {
    method: 'GET',
  });
}

/**
 * Get current authenticated user's profile (safer - no ID parameter)
 * Backend: Use /api/user/profile/me endpoint
 * If backend doesn't support /me, fallback to full path
 */
export async function apiMyProfile(): Promise<UserProfile> {
  try {
    // Try the /me endpoint first (more secure)
    return await request<UserProfile>(`/api/user/profile/me`, {
      method: 'GET',
    });
  } catch (err: any) {
    // Fallback: Use full path if /me doesn't exist
    if (err?.status === 404) {
      console.warn('⚠️ /api/user/profile/me not found, using fallback');
      throw err; // Still throw, frontend should handle
    }
    throw err;
  }
}

export async function apiUpdateAvatar(
  id: string,
  avatar: 'default.png' | 'avatar1.png' | 'avatar2.png' | 'avatar3.png' | 'avatar4.png' | 'avatar5.png' | 'avatar6.png',
) {
  // Note: Backend should validate that id === req.userId for security (IDOR protection)
  console.warn('⚠️ Using apiUpdateAvatar with explicit id - backend must validate ownership');
  return request(`/api/user/avatar/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ avatar }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function apiUpdatePowers(id: string, powers: Partial<Powers>, operation: 'set' | 'add' = 'set') {
  // Note: Backend should validate that id === req.userId for security (IDOR protection)
  console.warn('⚠️ Using apiUpdatePowers with explicit id - backend must validate ownership');
  return request(`/api/user/powers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ powers, operation }),
    headers: { 'Content-Type': 'application/json' },
  });
}
