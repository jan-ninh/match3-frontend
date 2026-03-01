// src/features/gameplay/lib/match3Engine/power/usePowerRequestIdAllocator.ts
import { useCallback, useRef } from 'react';

export function usePowerRequestIdAllocator() {
  // monotonic requestId allocator for power flows (prevents requestId=0 breaking consume dedupe)
  const nextPowerRequestIdRef = useRef(1);

  const allocPowerRequestId = useCallback((maybe: unknown): number => {
    if (typeof maybe === 'number' && Number.isFinite(maybe)) {
      const v = maybe | 0;
      if (v > 0) return v;
    }

    const v = nextPowerRequestIdRef.current | 0;
    nextPowerRequestIdRef.current = (v + 1) | 0;
    return Math.max(1, v);
  }, []);

  return { allocPowerRequestId };
}
