import { useCallback } from 'react';
import { useAccountOutcome } from '@/context/OutcomeContext';
export function useLoseFlow(args: { userId: string | null; accountAttemptId?: string; openLose: (stage: number) => void }) {
  const { store } = useAccountOutcome();
  const runLoseFlow = useCallback(
    async (stage: number) => {
      if (!args.userId || !args.accountAttemptId) return;
      const binding = store.getSnapshot().binding;
      if (binding?.stageNumber !== stage || binding.attemptId !== args.accountAttemptId) return;
      void store.finish(args.accountAttemptId, 'LOSS', () => args.openLose(stage));
    },
    [args, store],
  );
  return { runLoseFlow };
}
