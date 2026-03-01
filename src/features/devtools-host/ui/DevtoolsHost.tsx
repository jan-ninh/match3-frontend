// src/features/devtools-host/ui/DevtoolsHost.tsx
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { resetProgress } from '@/services/progress/progressActions';

import { useAuth } from '@/context/AuthContext';
import { usePowers } from '@/context/PowerContext';
import { useOverlays } from '@/features/overlays';

import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { useMatch3Engine } from '../lib/useMatch3Engine';
import { useDevOverlayState } from '../lib/devtools/useDevOverlayState';
import { usePossibleMatchSwaps } from '../lib/match/usePossibleMatchSwaps';
import { useTilesetPaletteCycle } from '../lib/tiles/useTilesetPaletteCycle';

import { useUsedPowerTracker } from '@/features/gameplay/lib/powers/useUsedPowerTracker';
import { useStageStartSync } from '@/features/gameplay/lib/backend/useStageStartSync';

import { useWinFlow } from '../lib/outcome/useWinFlow';
import { useLoseFlow } from '../lib/outcome/useLoseFlow';
import { useOutcomeReactions } from '../lib/outcome/useOutcomeReactions';

import DevPanels from './DevPanels';
import GameContainer from './GameContainer';

type Props = {
  initialLevelId?: number;
};

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
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
    events,
  } = useMatch3Engine({
    initialLevelId,
  });

  const { debugEnabled, showMatches, showLockoutHints, onToggleShowMatches, onToggleShowLockoutHints } = useDevOverlayState({ isDev });

  const matchSwaps = usePossibleMatchSwaps({ enabled: isDev && debugEnabled, state });

  const { tilesVersion, onDevNextTilesPalette } = useTilesetPaletteCycle();

  const { getUsedPower, resetUsedPower } = useUsedPowerTracker({ levelId: state.levelId });

  // Demo/presentation: in dev builds allow free level hopping even when the debug overlay is closed.
  const allowDevLevelHop = isDev;

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  useStageStartSync({
    userId,
    levelId: state.levelId,
    selectedPowersForNextStage,
    allowDevLevelHop,
    navigate,
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
    phase: state.phase,
    runWinFlow,
    runLoseFlow,
  });

  const onDevResetProgress = useCallback(async () => {
    // Guest mode only.
    if (!userId) {
      await resetProgress();
    }
  }, [userId]);

  // Defensive: when leaving dev mode, reset the top-offset CSS var.
  useEffect(() => {
    if (isDev && debugEnabled) return;
    document.documentElement.style.removeProperty('--dev-panels-top');
  }, [isDev, debugEnabled]);

  return (
    <div className="w-full h-full">
      <DevPanels
        enabled={isDev && debugEnabled}
        events={events}
        onDevWin={onDevWin}
        onDevLose={onDevLose}
        onDevResetProgress={onDevResetProgress}
        onDevFixedSeed={onDevFixedSeed}
      />

      <GameContainer
        state={state}
        inputLocked={inputLocked}
        canSwapAt={canSwapAt}
        onIntent={onIntent}
        isDev={isDev}
        debugEnabled={debugEnabled}
        showLockoutHints={showLockoutHints}
        showMatches={showMatches}
        matchSwaps={matchSwaps}
        onToggleShowMatches={onToggleShowMatches}
        onToggleShowLockoutHints={onToggleShowLockoutHints}
        onDevResetBoard={onDevResetBoard}
        onDevPrevLevel={onDevPrevLevel}
        onDevNextLevel={onDevNextLevel}
        onDevSetLevel={onDevSetLevel}
        onDevNextTilesPalette={onDevNextTilesPalette}
        onTimeExpired={onDevLose}
        gridRowRef={gridRowRef}
        tilesVersion={tilesVersion}
      />
    </div>
  );
}
