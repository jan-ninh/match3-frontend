// src/features/devtools-host/lib/outcome/useLoseFlow.ts
import { useCallback } from 'react';

import { apiLoseGame } from '@/api/game';
import { resetProgress } from '@/services/progress/progressActions';
import type { Powers } from '@/types';

type OpenLoseFn = (lvl: number) => void;

function extractPowersFromLoseResponse(res: unknown): Powers | null {
  if (!res || typeof res !== 'object') return null;
  const rec = res as Record<string, unknown>;
  const powers = rec.powers;
  if (!powers || typeof powers !== 'object') return null;
  return powers as Powers;
}

export function useLoseFlow(args: {
  userId: string | null;
  setPowers: (powers: Powers) => void;
  setSelectedPowersForNextStage: (v: Partial<Powers> | null) => void;
  onDevSetLevel: (lvl: number) => void;
  openLose: OpenLoseFn;
}): { runLoseFlow: (lvl: number) => Promise<void> } {
  const runLoseFlow = useCallback(
    async (lvl: number) => {
      if (args.userId) {
        try {
          const result = await apiLoseGame(args.userId);
          const nextPowers = extractPowersFromLoseResponse(result);
          if (nextPowers) args.setPowers(nextPowers);
        } catch (err) {
          console.error(`Failed to report dev lose for ${lvl}:`, err);
        }
      }

      // Local progress is also reset (map cache).
      try {
        await resetProgress();
      } catch {
        // ignore local progress errors
      }

      args.setSelectedPowersForNextStage(null);
      args.onDevSetLevel(1);
      args.openLose(lvl);
    },
    [args],
  );

  return { runLoseFlow };
}
