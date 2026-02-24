import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { apiLogin, apiRegister, apiLogout, type UserDTO } from '@/api/auth';
import type { UserProfile, Powers } from '@/types';
import { apiProfile, apiUpdateAvatar, apiUpdatePowers } from '@/api/user';

type AuthContextValue = {
  user: UserDTO | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (email: string, username: string, password: string) => Promise<UserDTO>;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  updateAvatar: (avatar: UserDTO['avatar']) => Promise<void>;
  updatePowers: (powers: Partial<Powers>, operation?: 'set' | 'add') => Promise<void>;
};

const USER_STORAGE_KEY = 'user';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDTO | null>(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserDTO) : null;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // safe persist function to store user info without token in localStorage
  const persist = useCallback((u: UserDTO | null) => {
    if (!u) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    // user object may contain sensitive info, so we only store safe fields
    const safe = { id: u.id, username: u.username, avatar: u.avatar ?? null, email: u.email };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safe));
  }, []);

  const normalizeAndRethrow = (err: any) => {
    const message = err?.message ?? 'Server error';
    const e: any = new Error(message);
    if (err?.payload) e.payload = err.payload;
    if (err?.status) e.status = err.status;
    throw e;
  };

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const id = user?.id;
    if (!id) return null;
    try {
      const p = await apiProfile(id);
      setProfile(p);
      return p;
    } catch (err) {
      console.error('refreshProfile failed', err);
      return null;
    }
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const dto = await apiLogin(email, password);
        setUser(dto);
        persist(dto); // token in cookie is set by server, we just store user info in localStorage
        refreshProfile().catch(() => {});
        return dto;
      } catch (err: any) {
        normalizeAndRethrow(err);
      } finally {
        setLoading(false);
      }
    },
    [persist, refreshProfile],
  );

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      setLoading(true);
      try {
        const dto = await apiRegister(email, username, password);
        setUser(dto);
        persist(dto);
        refreshProfile().catch(() => {});
        return dto;
      } catch (err: any) {
        normalizeAndRethrow(err);
      } finally {
        setLoading(false);
      }
    },
    [persist, refreshProfile],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('logout API failed', err);
    } finally {
      setUser(null);
      setProfile(null);
      persist(null); // localStorage should be cleared
    }
  }, [persist]);

  const updateAvatar = useCallback(
    async (avatar: UserDTO['avatar']) => {
      if (!user) throw new Error('no user');
      try {
        await apiUpdateAvatar(
          user.id,
          (avatar || 'default.png') as 'default.png' | 'avatar1.png' | 'avatar2.png' | 'avatar3.png' | 'avatar4.png' | 'avatar5.png' | 'avatar6.png',
        );
        await refreshProfile();
      } catch (err) {
        console.error('updateAvatar failed', err);
        throw err;
      }
    },
    [user, refreshProfile],
  );

  const updatePowers = useCallback(
    async (powers: Partial<Powers>, operation: 'set' | 'add' = 'set') => {
      if (!user) throw new Error('no user');
      try {
        await apiUpdatePowers(user.id, powers, operation);
        await refreshProfile();
      } catch (err) {
        console.error('updatePowers failed', err);
        throw err;
      }
    },
    [user, refreshProfile],
  );

  //refresh profile on mount if user exists but profile is not loaded (e.g. after page refresh)
  useEffect(() => {
    if (user && !profile) {
      refreshProfile().catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      updateAvatar,
      updatePowers,
    }),
    [user, profile, loading, login, register, logout, refreshProfile, updateAvatar, updatePowers],
  );

  return <AuthContext.Provider value={value as AuthContextValue}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
