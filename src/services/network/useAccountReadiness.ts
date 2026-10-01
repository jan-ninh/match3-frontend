import { useSyncExternalStore } from 'react';
import { backendReadiness } from '@/api/http';

export function useAccountReadiness() {
  return useSyncExternalStore(backendReadiness.subscribe, backendReadiness.getSnapshot);
}
