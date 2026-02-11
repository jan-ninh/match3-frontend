// src/context/AuthContext.tsx
// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { apiLogin, apiRegister, type UserDTO } from '@/api/auth';
import type { UserProfile, Powers } from '@/types';
import { apiProfile, apiUpdateAvatar, apiUpdatePowers } from '@/api/user';

type AuthContextValue = {
  user: UserDTO | null; // minimal persisted user
  profile: UserProfile | null; // full profile (can be null)
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

  // persist minimal safe user
  const persist = useCallback((u: UserDTO | null) => {
    if (!u) return localStorage.removeItem(USER_STORAGE_KEY);
    const safe = { id: u.id, username: u.username, avatar: u.avatar ?? null };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safe));
  }, []);

  const normalizeAndRethrow = (err: any) => {
    const message = err?.message ?? 'Server error';
    const e: any = new Error(message);
    if (err?.payload) e.payload = err.payload;
    if (err?.status) e.status = err.status;
    throw e;
  };

  // fetch full profile using stored user id (if available)
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

  // login flow: save minimal user, then hydrate profile
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const dto = await apiLogin(email, password);
        setUser(dto);
        persist(dto);
        // try to hydrate profile but don't block returning dto
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

  const logout = useCallback(() => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // helpers to update avatar/powers and keep profile in sync
  const updateAvatar = useCallback(
    async (avatar: UserDTO['avatar']) => {
      if (!user) throw new Error('no user');
      try {
        await apiUpdateAvatar(
          user.id,
          (avatar || 'default.png') as 'default.png' | 'avatar1.png' | 'avatar2.png' | 'avatar3.png' | 'avatar4.png' | 'avatar5.png' | 'avatar6.png',
        );
        // api returns { avatar: '...' } — refresh local profile
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
        // server returns new powers — refresh or patch locally
        // choose refresh for simplicity:
        await refreshProfile();
      } catch (err) {
        console.error('updatePowers failed', err);
        throw err;
      }
    },
    [user, refreshProfile],
  );

  // on mount: if we had minimal user but no profile, try hydrate
  useEffect(() => {
    if (user && !profile) {
      // don't await — background hydrate
      refreshProfile().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

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
