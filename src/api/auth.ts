// src/api/auth.ts
// Small auth API wrapper. Exports functions the frontend will call.

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
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(email: string, username: string, password: string): Promise<UserDTO> {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password, confirmPassword: password }),
  });
}
