import { useEffect, useRef, useState } from 'react';
import type { LaserStrikeBurst } from './fx/LaserRowStrikeFxLayer';

export type UseLaserStrikeBurstsOpts = Readonly<{
  defaultStartDelayMs: number;
  defaultLifeMs: number;
}>;

export type UseLaserStrikeBurstsResult = Readonly<{
  laserStrikes: readonly LaserStrikeBurst[];
  pushLaserStrike: (row: number, startDelayMs?: number, lifeMs?: number) => void;
}>;

// Laser strike FX (UI-only): play a short blue beam on the chosen row.
// Triggered when the user confirms a target cell while laser is armed.
export function useLaserStrikeBursts({ defaultStartDelayMs, defaultLifeMs }: UseLaserStrikeBurstsOpts): UseLaserStrikeBurstsResult {
  const [laserStrikes, setLaserStrikes] = useState<readonly LaserStrikeBurst[]>([]);
  const laserStrikeSeqRef = useRef(0);
  const laserStrikeTimersRef = useRef<Map<string, number[]>>(new Map());

  const addTimer = (id: string, t: number) => {
    const arr = laserStrikeTimersRef.current.get(id);
    if (arr) arr.push(t);
    else laserStrikeTimersRef.current.set(id, [t]);
  };

  const pushLaserStrike = (row: number, startDelayMs = defaultStartDelayMs, lifeMs = defaultLifeMs) => {
    if (typeof window === 'undefined') return;

    const id = `laserStrike-${Date.now()}-${(laserStrikeSeqRef.current += 1)}`;

    // (A) FX start — optionally delayed
    const tStart = window.setTimeout(() => {
      setLaserStrikes((prev) => [...prev, { id, row }]);

      // (C) FX end — lifetime counted AFTER it becomes visible
      const tEnd = window.setTimeout(() => {
        setLaserStrikes((prev) => prev.filter((b) => b.id !== id));
        laserStrikeTimersRef.current.delete(id);
      }, lifeMs);

      addTimer(id, tEnd);
    }, startDelayMs);

    addTimer(id, tStart);
  };

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;
      for (const arr of laserStrikeTimersRef.current.values()) {
        for (const t of arr) window.clearTimeout(t);
      }
      laserStrikeTimersRef.current.clear();
    };
  }, []);

  return { laserStrikes, pushLaserStrike };
}
