// src/context/AuthContext.tsx
// Simple AuthContext to hold the logged-in user in memory and localStorage.
// This approach stores the whole user object (no token). It's fine for dev but
// not recommended for production security. Use tokens/cookies later.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogin, apiRegister, type UserDTO } from '@/api/auth';

type AuthContextValue = {
  user: UserDTO | null;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (email: string, username: string, password: string) => Promise<UserDTO>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load persisted user (if any)
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // parsed is minimal (id, username, avatar). We keep it as user=null until real login or we accept partial.
        // If you prefer to hydrate full UserDTO from server, call a "me" endpoint here.
        setUser((prev) => prev ?? (parsed as UserDTO));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const persistToLocal = (u: UserDTO | null) => {
    if (!u) {
      localStorage.removeItem('user');
      return;
    }
    // persist only safe fields
    const safe = { id: u.id, username: u.username, avatar: u.avatar ?? null };
    localStorage.setItem('user', JSON.stringify(safe));
  };

  const normalizeAndRethrow = (err: any) => {
    const message = err?.message ?? 'Server error';
    const e: any = new Error(message);
    if (err?.payload) e.payload = err.payload;
    if (err?.status) e.status = err.status;
    throw e;
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      setUser(data);
      persistToLocal(data);
      return data;
    } catch (err: any) {
      normalizeAndRethrow(err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRegister(email, username, password);
      setUser(data);
      persistToLocal(data);
      return data;
    } catch (err: any) {
      normalizeAndRethrow(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };
  const value = useMemo(
    () => ({ user, login, register, logout, loading }),
    // login/register/logout are stable here; if you wrap them in useCallback change deps accordingly
    [user, loading],
  );

  return <AuthContext.Provider value={value as AuthContextValue}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
