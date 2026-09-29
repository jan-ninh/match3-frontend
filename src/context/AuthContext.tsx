import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { apiLogin, apiRegister, type UserDTO } from '@/api/auth';
import { apiProfile, apiUpdateAvatar, apiUpdatePowers } from '@/api/user';
import type { UserProfile, Powers } from '@/types';
import { ModeStore, readLegacyHint } from '@/services/account/modeStore';
import { RequestError } from '@/api/transport';
import type { ModeSnapshot } from '@/services/account/modeStore';
// Compatibility adapter only. The selected legacy ID is not verified authentication.
type AccountHint = Pick<UserDTO, 'id' | 'username' | 'avatar'>;
type AuthValue = ModeSnapshot<AccountHint, UserProfile> & {
  user: AccountHint | null;
  savedUser: AccountHint | null;
  loading: boolean;
  canUseAccount: boolean;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (email: string, username: string, password: string) => Promise<UserDTO>;
  logout: () => void;
  playDemo: () => void;
  resumeAccount: () => void;
  retryAccount: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  isCurrent: (generation: number, id?: string) => boolean;
  updateAvatar: (avatar: UserDTO['avatar']) => Promise<void>;
  updatePowers: (powers: Partial<Powers>, operation?: 'set' | 'add') => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new ModeStore<AccountHint, UserProfile>());
  const [savedUser, setSavedUser] = useState<AccountHint | null>(() => readLegacyHint(() => window.localStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const actions = useMemo(() => {
    const refreshProfile = () => store.refresh(apiProfile);
    const remember = (dto: UserDTO) => {
      const hint = { id: dto.id, username: dto.username, avatar: dto.avatar };
      setSavedUser(hint);
      try {
        localStorage.setItem('user', JSON.stringify(hint));
      } catch {
        /* memory-only hint */
      }
    };
    const enterCredentials = async (load: () => Promise<UserDTO>) => {
      const generation = store.beginAccount(null);
      try {
        const dto = await load();
        if (!dto || typeof dto.id !== 'string' || !dto.id || typeof dto.username !== 'string') throw new RequestError('protocol');
        if (!store.setIdentity(generation, dto)) throw new RequestError('cancelled');
        remember(dto);
        void refreshProfile();
        return dto;
      } catch (error) {
        store.rejectIntent(generation, error);
        throw error;
      }
    };
    const assertOwner = () => {
      const current = store.getSnapshot();
      if (current.mode !== 'legacy-account' || current.availability !== 'available' || !current.selected) throw new RequestError('forbidden');
      return { generation: current.generation, id: current.selected.id };
    };
    return {
      login: (email: string, password: string) => enterCredentials(() => apiLogin(email, password)),
      register: (email: string, username: string, password: string) => enterCredentials(() => apiRegister(email, username, password)),
      resumeAccount: () => {
        if (savedUser) {
          store.beginAccount(savedUser);
          void refreshProfile();
        }
      },
      retryAccount: () => {
        if (store.getSnapshot().selected) void refreshProfile();
      },
      refreshProfile,
      isCurrent: store.isCurrent,
      playDemo: store.playDemo,
      logout: () => {
        store.playDemo();
        setSavedUser(null);
        try {
          localStorage.removeItem('user');
        } catch {
          /* Demo stays usable */
        }
      },
      updateAvatar: async (avatar: UserDTO['avatar']) => {
        const owner = assertOwner();
        await apiUpdateAvatar(owner.id, (avatar || 'default.png') as UserProfile['avatar']);
        if (store.isCurrent(owner.generation, owner.id)) await refreshProfile();
      },
      updatePowers: async (powers: Partial<Powers>, operation: 'set' | 'add' = 'set') => {
        const owner = assertOwner();
        await apiUpdatePowers(owner.id, powers, operation);
        if (store.isCurrent(owner.generation, owner.id)) await refreshProfile();
      },
    };
  }, [store, savedUser]);
  const value: AuthValue = {
    ...snapshot,
    ...actions,
    user: snapshot.mode === 'legacy-account' ? snapshot.selected : null,
    savedUser,
    loading: snapshot.profileRequest === 'loading',
    canUseAccount: snapshot.mode === 'legacy-account' && snapshot.availability === 'available',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Missing legacy account adapter');
  return value;
}
