import { RequestError } from '@/api/transport';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { apiLogin, apiRegister, type UserDTO } from '@/api/auth';
import { apiUpdateAvatar } from '@/api/user';
import { accountSession, backendReadiness } from '@/api/http';
import type { SessionSnapshot } from '@/services/account/modeStore';
type AuthValue = SessionSnapshot & {
  user: Pick<UserDTO, 'id' | 'username' | 'avatar'> | null;
  loading: boolean;
  canUseAccount: boolean;
  login: typeof apiLogin;
  register: typeof apiRegister;
  logout: () => void;
  playDemo: () => void;
  resumeAccount: () => void;
  retryAccount: () => void;
  refreshProfile: typeof accountSession.refreshProfile;
  isCurrent: typeof accountSession.isCurrent;
  updateAvatar: (avatar: UserDTO['avatar']) => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(accountSession.subscribe, accountSession.getSnapshot);
  useEffect(() => {
    backendReadiness.start();
    accountSession.restorePrevious(backendReadiness.waitForReady);
  }, []);
  const id = snapshot.selected?.id,
    username = snapshot.selected?.username,
    avatar = snapshot.selected?.avatar;
  const user = useMemo(() => (id && username && avatar ? { id, username, avatar } : null), [id, username, avatar]);
  const actions = useMemo(
    () => ({
      login: apiLogin,
      register: apiRegister,
      logout: () => {
        try {
          localStorage.removeItem('user');
        } catch {
          /* no guest keys touched */
        }
        void accountSession.logout();
      },
      playDemo: accountSession.playDemo,
      resumeAccount: () => {
        if (backendReadiness.getSnapshot() === 'unavailable') backendReadiness.retry();
        void accountSession.restore(backendReadiness.waitForReady);
      },
      retryAccount: () => {
        if (backendReadiness.getSnapshot() === 'unavailable') backendReadiness.retry();
        void accountSession.restore(backendReadiness.waitForReady);
      },
      refreshProfile: accountSession.refreshProfile,
      isCurrent: accountSession.isCurrent,
      updateAvatar: async (avatar: UserDTO['avatar']) => {
        const { selected, generation } = accountSession.getSnapshot();
        if (!selected || accountSession.getSnapshot().availability !== 'available') throw new RequestError('unavailable');
        await apiUpdateAvatar(selected.id, avatar);
        if (accountSession.isCurrent(generation, selected.id)) await accountSession.refreshProfile();
      },
    }),
    [],
  );
  return (
    <AuthContext.Provider
      value={{
        ...snapshot,
        ...actions,
        user,
        loading: snapshot.profileRequest === 'loading',
        canUseAccount: snapshot.mode === 'account' && snapshot.session === 'verified' && snapshot.availability === 'available',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Missing account session provider');
  return value;
}
