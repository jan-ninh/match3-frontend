// src/features/gameplay/lib/powers/useUsedPowerTracker.ts
// src/features/gameplay/lib/powers/useUsedPowerTracker.ts
import { useCallback, useEffect, useRef } from 'react';

import { POWER_CONSUME_EVENT, type PowerConsumeDetail } from '@/context/powerEvents';
import type { PowerKey } from '@/types';

import { toBackendPowerKey } from './rewardMapping';

export type UsedPowerTracker = {
  getUsedPower: () => PowerKey | undefined;
  resetUsedPower: () => void;
};

export function useUsedPowerTracker(args: { levelId: number }): UsedPowerTracker {
  // Ref (no state) => avoids rerenders.
  const usedPowerRef = useRef<PowerKey | null>(null);

  // Reset "used power" when level changes (no render, no cascading effects).
  useEffect(() => {
    usedPowerRef.current = null;
  }, [args.levelId]);

  // Track power consumption during gameplay.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume: EventListener = (e) => {
      const ce = e as CustomEvent<PowerConsumeDetail>;
      const detail = ce.detail;
      if (!detail) return;

      const backendPowerKey = toBackendPowerKey(detail.key);
      if (!backendPowerKey) return;

      // Store the power that was used (only first used power per stage).
      if (!usedPowerRef.current) {
        usedPowerRef.current = backendPowerKey;
      }
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume);
  }, []);

  const resetUsedPower = useCallback(() => {
    usedPowerRef.current = null;
  }, []);

  const getUsedPower = useCallback((): PowerKey | undefined => usedPowerRef.current ?? undefined, []);

  return { getUsedPower, resetUsedPower };
}
