import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { GuestStore, GUEST_STORAGE_KEY } from '@/services/guest/guestStore';
import { GuestContext } from './GuestContext';

export function GuestProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new GuestStore(() => window.localStorage));
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUEST_STORAGE_KEY || event.key === null) store.syncExternal(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <GuestContext.Provider value={{ ...snapshot, store }}>{children}</GuestContext.Provider>;
}
