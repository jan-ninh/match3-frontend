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
  const { profile, refreshProfile } = useAuth();
  const [id] = useState(() => crypto.randomUUID());
  const runWinFlow = useCallback(
    (stage: number) => {
      if (!args.userId) return;
      const usedPower = args.getUsedPower();
      store.start({
        ownerId: args.userId,
        id,
        stage,
        rewardFromLevel: profile?.playerLevel,
        write: () => apiCompleteStage(args.userId!, stage, usedPower),
        present: () => args.openWin({ level: stage, mode: 'returnToMap' }),
        confirmed: () => {
          void refreshProfile();
        },
      });
    },
    [args, store, id, profile, refreshProfile],
  );
  return { runWinFlow };
}
