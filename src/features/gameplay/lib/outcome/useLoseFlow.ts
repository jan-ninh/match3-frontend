import { useCallback, useState } from 'react';
import { apiLoseGame } from '@/api/game';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { useAuth } from '@/context/AuthContext';
export function useLoseFlow(args: { userId: string | null; openLose: (stage: number) => void }) {
  const { store } = useAccountOutcome();
  const { refreshProfile } = useAuth();
  const [id] = useState(() => crypto.randomUUID());
  const runLoseFlow = useCallback(
    async (stage: number) => {
      if (!args.userId) return;
      store.start({
        ownerId: args.userId,
        id,
        stage,
        write: () => apiLoseGame(args.userId!),
        present: () => args.openLose(stage),
        confirmed: () => {
          void refreshProfile();
        },
      });
    },
    [args, store, id, refreshProfile],
  );
  return { runLoseFlow };
}
