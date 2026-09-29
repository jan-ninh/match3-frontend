import { useCallback, useState } from 'react';
import { apiLoseGame } from '@/api/game';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { useAuth } from '@/context/AuthContext';
export function useLoseFlow(args: { userId: string | null; openLose: (stage: number) => void }) {
  const { store } = useAccountOutcome();
  const { refreshProfile, generation, isCurrent } = useAuth();
  const [id] = useState(() => crypto.randomUUID());
  const runLoseFlow = useCallback(
    async (stage: number) => {
      if (!args.userId || !isCurrent(generation, args.userId)) return;
      store.start({
        ownerId: args.userId,
        generation,
        id,
        stage,
        write: () => apiLoseGame(args.userId!),
        present: () => args.openLose(stage),
        confirmed: () => {
          if (isCurrent(generation, args.userId!)) void refreshProfile();
        },
      });
    },
    [args, store, id, refreshProfile, generation, isCurrent],
  );
  return { runLoseFlow };
}
