import { useEffect, useRef, useState } from 'react';

export function useDevSnapshot<T>(initial: T, hz: number) {
  const isDev = import.meta.env.DEV;

  const snapshotRef = useRef<T>(initial);
  const [snapshot, setSnapshot] = useState<T>(initial);

  useEffect(() => {
    if (!isDev) return;

    const intervalMs = Math.max(1, Math.round(1000 / hz));
    const id = window.setInterval(() => {
      setSnapshot(snapshotRef.current);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [isDev, hz]);

  return { isDev, snapshotRef, snapshot };
}
