// src/api/auth.ts
// API wrapper

import { request } from './http';

export type UserDTO = {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  totalScore?: number;
  hearts?: number;
};

export async function apiLogin(email: string, password: string): Promise<UserDTO> {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(email: string, username: string, password: string): Promise<UserDTO> {
  return request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, confirmPassword: password }),
  });
}

export async function apiLogout(): Promise<void> {
  return request('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
