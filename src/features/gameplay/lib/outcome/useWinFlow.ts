import { RequestError } from '@/api/transport';
import { useCallback, useState } from 'react';
import { apiCompleteStage } from '@/api/game';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { useAuth } from '@/context/AuthContext';
import type { PowerKey } from '@/types';
export function useWinFlow(args: {
  userId: string | null;
  getUsedPower: () => PowerKey | undefined;
  openWin: (opts: { level: number; mode: 'returnToMap' }) => void;
}) {
  const { store } = useAccountOutcome();
  const { profile, refreshProfile, generation, isCurrent, session } = useAuth();
  const [id] = useState(() => crypto.randomUUID());
  const runWinFlow = useCallback(
    (stage: number) => {
      if (!args.userId || !isCurrent(generation)) return;
      const usedPower = args.getUsedPower();
      store.start({
        ownerId: args.userId,
        generation,
        id,
        stage,
        rewardFromLevel: profile?.playerLevel,
        write: () =>
          isCurrent(generation, args.userId!)
            ? apiCompleteStage(args.userId!, stage, usedPower)
            : Promise.reject(new RequestError(session === 'expired' ? 'unauthenticated' : 'unavailable')),
        present: () => args.openWin({ level: stage, mode: 'returnToMap' }),
        confirmed: () => {
          if (isCurrent(generation, args.userId!)) void refreshProfile();
        },
      });
    },
    [args, store, id, profile, refreshProfile, generation, isCurrent, session],
  );
  return { runWinFlow };
}
