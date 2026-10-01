import { useCallback, useEffect, useState } from 'react';
import { RequestError } from '@/api/transport';
export type ReadState<T> = { key: string; status: 'loading' | 'success' | 'error'; data?: T; error?: RequestError };
export function useRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [cycle, setCycle] = useState(0);
  const [state, setState] = useState<ReadState<T>>({ key, status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setState({ key, status: 'loading' });
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) setState({ key, status: 'success', data });
      } catch (e) {
        if (!controller.signal.aborted) setState({ key, status: 'error', error: e instanceof RequestError ? e : new RequestError('protocol') });
      }
    });
    return () => controller.abort();
  }, [key, load, cycle]);
  const retry = useCallback(() => setCycle((n) => n + 1), []);
  return { ...(state.key === key ? state : { key, status: 'loading' as const }), retry };
}
