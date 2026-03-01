// src/features/gameplay/ui/GameplayRoot.tsx
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router';

import type { EngineState } from '@/gamelogic';
import type { InputIntent } from '@/features/grid';

import { useAuth } from '@/context/AuthContext';
import { usePowers } from '@/context/PowerContext';
import { useOverlays } from '@/features/overlays';

import { useMatch3Engine } from '@/features/gameplay/lib/useMatch3Engine';
import { useStageStartSync } from '@/features/gameplay/lib/backend/useStageStartSync';
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
  /**
   * Dev-only escape hatch:
   * when true, backend progression gating is ignored (presentations / free level hopping).
   */
  allowDevLevelHop?: boolean;
  children: ReactNode;
};

export function GameplayRoot({ initialLevelId = 1, allowDevLevelHop = false, children }: Props) {
  const navigate = useNavigate();

  const { openWin, openLose, openMissionReport, openLevelUp } = useOverlays();
  const { user, profile, refreshProfile, updatePowers } = useAuth();
  const userId = user?.id ?? null;

  const { powers, setPowers, selectedPowersForNextStage, setSelectedPowersForNextStage } = usePowers();

  const {
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
  } = useMatch3Engine({ initialLevelId });

  const { getUsedPower, resetUsedPower } = useUsedPowerTracker({ levelId: state.levelId });

  useStageStartSync({
    userId,
    levelId: state.levelId,
    selectedPowersForNextStage,
    allowDevLevelHop,
    navigate: (to, opts) => navigate(to, opts),
    onDevSetLevel,
    setPowers,
    setSelectedPowersForNextStage,
    resetUsedPower,
  });

  const { runWinFlow } = useWinFlow({
    userId,
    profile,
    refreshProfile,
    updatePowers,
    powers,
    setPowers,
    setSelectedPowersForNextStage,
    getUsedPower,
    openWin,
    openMissionReport,
    openLevelUp,
    navigate: (to) => navigate(to),
  });

  const { runLoseFlow } = useLoseFlow({
    userId,
    setPowers,
    setSelectedPowersForNextStage,
    onDevSetLevel,
    openLose,
  });

  const { onDevWin, onDevLose } = useOutcomeReactions({
    levelId: state.levelId,
    phase: String(state.phase),
    runWinFlow,
    runLoseFlow,
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
      onDevNextLevel,
      onDevPrevLevel,
      onDevSetLevel,
      onDevWin,
      onDevLose,
    }),
    [
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
