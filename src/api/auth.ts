import { accountSession } from './http';
import type { CurrentUser } from './profileShape';
export type UserDTO = CurrentUser;
export const apiLogin = (email: string, password: string) => accountSession.credentials('/api/auth/login', { email, password });
export const apiRegister = (email: string, username: string, password: string) =>
  accountSession.credentials('/api/auth/register', { email, username, password, confirmPassword: password });
