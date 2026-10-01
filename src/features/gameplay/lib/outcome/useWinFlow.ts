import { useCallback } from 'react';
import { useAccountOutcome } from '@/context/OutcomeContext';
import type { PowerKey } from '@/types';
export function useWinFlow(args: {
  userId: string | null;
  accountAttemptId?: string;
  getUsedPower: () => PowerKey | undefined;
  openWin: (opts: { level: number; mode: 'returnToMap' }) => void;
}) {
  const { store } = useAccountOutcome();
  const runWinFlow = useCallback(
    (stage: number) => {
      if (!args.userId || !args.accountAttemptId) return;
      const binding = store.getSnapshot().binding;
      if (binding?.stageNumber !== stage || binding.attemptId !== args.accountAttemptId) return;
      void store.finish(args.accountAttemptId, 'WIN', () => args.openWin({ level: stage, mode: 'returnToMap' }));
    },
    [args, store],
  );
  return { runWinFlow };
}
