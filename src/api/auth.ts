// src/api/auth.ts
// API wrapper

import { request, setAuthToken } from './http';

export type UserDTO = {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  totalScore?: number;
  hearts?: number;
  token?: string;
};

export async function apiLogin(email: string, password: string): Promise<UserDTO> {
  const result = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  // Store token from response if provided (for cross-domain deployments)
  if ((result as any)?.token) {
    setAuthToken((result as any).token);
    console.log('🔐 Token stored from login response');
  }
  
  return result as UserDTO;
}

export async function apiRegister(email: string, username: string, password: string): Promise<UserDTO> {
  const result = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, confirmPassword: password }),
  });
  
  // Store token from response if provided (for cross-domain deployments)
  if ((result as any)?.token) {
    setAuthToken((result as any).token);
    console.log('🔐 Token stored from registration response');
  }
  
  return result as UserDTO;
}

export async function apiLogout(): Promise<void> {
  try {
    return await request('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    // Always clear token on logout
    setAuthToken(null);
    console.log('🔓 Token cleared on logout');
  }
}
