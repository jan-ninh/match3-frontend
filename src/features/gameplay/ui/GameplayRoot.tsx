// src/features/gameplay/ui/GameplayRoot.tsx
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { EngineState } from '@/gamelogic';
import type { InputIntent } from '@/features/grid';

import { useGuest } from '@/context/GuestContext';
import { resolveGuestStage } from '@/services/guest/guestStore';
import { useAuth } from '@/context/AuthContext';
import { useOverlays } from '@/features/overlays';

import { useMatch3Engine } from '@/features/gameplay/lib/useMatch3Engine';
import { useLoseFlow } from '@/features/gameplay/lib/outcome/useLoseFlow';
import { useOutcomeReactions } from '@/features/gameplay/lib/outcome/useOutcomeReactions';
import { useWinFlow } from '@/features/gameplay/lib/outcome/useWinFlow';
import { useUsedPowerTracker } from '@/features/gameplay/lib/powers/useUsedPowerTracker';

export type GameplayRuntime = {
  isDev: boolean;

  state: EngineState;
  inputLocked: boolean;

  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;

  // Engine controls (used by Devtools wrapper, and internally by backend guards)
  onDevResetBoard: () => void;
  onDevFixedSeed: () => void;
  onDevNextLevel: () => void;
  onDevPrevLevel: () => void;
  onDevSetLevel: (levelId: number) => void;

  // Outcome triggers (Dev panels + MatchRush timeout)
  onDevWin: () => void;
  onDevLose: () => Promise<void>;
};

const GameplayRuntimeContext = createContext<GameplayRuntime | null>(null);

export function useGameplayRuntime(): GameplayRuntime {
  const ctx = useContext(GameplayRuntimeContext);
  if (!ctx) throw new Error('useGameplayRuntime must be used within <GameplayRoot />');
  return ctx;
}

type Props = {
  initialLevelId?: number;
  guestBinding?: { runId: string; attemptId: string; stageId: number };
  /**
   * Dev-only escape hatch:
   * when true, backend progression gating is ignored (presentations / free level hopping).
   */
  allowDevLevelHop?: boolean;
  children: ReactNode;
};

export function GameplayRoot({ initialLevelId = 1, guestBinding, children }: Props) {
  const navigate = useNavigate();
  const { store } = useGuest();

  const { openWin, openLose } = useOverlays();
  const { user } = useAuth();
  // A mounted account board retains its owner when the session expires; it never becomes a guest board.
  const [accountOwner] = useState(() => (guestBinding ? null : (user?.id ?? null)));
  const userId = accountOwner;

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevFixedSeed, onDevNextLevel, onDevPrevLevel, onDevSetLevel } = useMatch3Engine({
    initialLevelId,
    guestBinding,
  });

  const { getUsedPower } = useUsedPowerTracker({ levelId: state.levelId });

  const { runWinFlow } = useWinFlow({ userId, getUsedPower, openWin });
  const { runLoseFlow } = useLoseFlow({ userId, openLose });

  const { onDevWin, onDevLose } = useOutcomeReactions({
    levelId: state.levelId,
    phase: String(state.phase),
    runWinFlow: (lvl) => {
      if (userId) {
        runWinFlow(lvl);
        return;
      }
      if (guestBinding && lvl === guestBinding.stageId && store.finish(guestBinding, 'WIN')) {
        openWin({ level: lvl, mode: 'returnToMap' });
      }
    },
    runLoseFlow: async (lvl) => {
      if (userId) {
        await runLoseFlow(lvl);
        return;
      }
      if (guestBinding && lvl === guestBinding.stageId && store.finish(guestBinding, 'LOSS')) openLose(lvl);
    },
  });

  const value = useMemo<GameplayRuntime>(
    () => ({
      isDev,
      state,
      inputLocked,
      canSwapAt,
      onIntent,
      onDevResetBoard,
      onDevFixedSeed,
      onDevNextLevel: userId ? onDevNextLevel : () => undefined,
      onDevPrevLevel: userId ? onDevPrevLevel : () => undefined,
      onDevSetLevel: userId ? onDevSetLevel : (lvl) => navigate('/game-map/play-game?level=' + resolveGuestStage(store.getSnapshot().save, lvl)),
      onDevWin,
      onDevLose,
    }),
    [
      userId,
      store,
      navigate,
      isDev,
      state,
      inputLocked,
      canSwapAt,
      onIntent,
      onDevResetBoard,
      onDevFixedSeed,
      onDevNextLevel,
      onDevPrevLevel,
      onDevSetLevel,
      onDevWin,
      onDevLose,
    ],
  );

  return <GameplayRuntimeContext.Provider value={value}>{children}</GameplayRuntimeContext.Provider>;
}
