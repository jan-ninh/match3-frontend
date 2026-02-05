// src/context/AuthContext.tsx
// Simple AuthContext to hold the logged-in user in memory and localStorage.
// This approach stores the whole user object (no token). It's fine for dev but
// not recommended for production security. Use tokens/cookies later.

import React, { createContext, useContext, useEffect, useState } from 'react';
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
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRegister(email, username, password);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
