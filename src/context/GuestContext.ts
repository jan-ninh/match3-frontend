import { createContext, useContext } from 'react';
import type { GuestSnapshot, GuestStore } from '@/services/guest/guestStore';

export const GuestContext = createContext<(GuestSnapshot & { store: GuestStore }) | null>(null);
export function useGuest() {
  const value = useContext(GuestContext);
  if (!value) throw new Error('useGuest requires GuestProvider');
  return value;
}
