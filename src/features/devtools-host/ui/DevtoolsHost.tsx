// src/features/devtools-host/ui/DevtoolsHost.tsx
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { apiCompleteStage, apiLoseGame, apiStartStage } from '@/api/game';
import { useAuth } from '@/context/AuthContext';
import { usePowers } from '@/context/PowerContext';
import { useOverlays } from '@/features/overlays';
import { completeLevel, resetProgress } from '@/services/progress/progressActions';
import type { PowerKey, Powers } from '@/types';

import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { useMatch3Engine } from '../lib/useMatch3Engine';
import { extractAllowedStage, getHttpMessage, getHttpStatus, isPrevStageNotCompleted } from '../lib/backend/httpError';
import { buildExpPreview } from '../lib/outcome/expPreview';
import { readPlayerMeta } from '../lib/outcome/playerMeta';
import { EXP_REQUIRED, EXP_WIN_DELTA, WIN_POWER_REWARD_AMOUNT } from '../lib/outcome/winFlowConfig';
import { toBackendRewardPowerId } from '../lib/powers/rewardMapping';
import { addReward, buildRewardAbsolute, buildRewardDelta } from '../lib/powers/rewardMath';
import { useDevOverlayState } from '../lib/devtools/useDevOverlayState';
import { usePossibleMatchSwaps } from '../lib/match/usePossibleMatchSwaps';
import { useTilesetPaletteCycle } from '../lib/tiles/useTilesetPaletteCycle';
import { useUsedPowerTracker } from '../lib/powers/useUsedPowerTracker';

import DevPanels from './DevPanels';
import GameContainer from './GameContainer';

type Props = {
  initialLevelId?: number;
};

function extractPowersFromLoseResponse(res: unknown): Powers | null {
  if (!res || typeof res !== 'object') return null;
  const rec = res as Record<string, unknown>;
  const powers = rec.powers;
  if (!powers || typeof powers !== 'object') return null;
  return powers as Powers;
}

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
  const navigate = useNavigate();

  const { openWin, openLose, openMissionReport, openLevelUp } = useOverlays();
  const { user, profile, refreshProfile, updatePowers } = useAuth();
  const userId = user?.id ?? null;
  const { powers, setPowers, selectedPowersForNextStage, setSelectedPowersForNextStage } = usePowers();

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevFixedSeed, onDevNextLevel, onDevPrevLevel, onDevSetLevel, events } =
    useMatch3Engine({
      initialLevelId,
    });

  const { debugEnabled, showMatches, showLockoutHints, onToggleShowMatches, onToggleShowLockoutHints } = useDevOverlayState({ isDev });

  const matchSwaps = usePossibleMatchSwaps({ enabled: isDev && debugEnabled, state });

  const { tilesVersion, onDevNextTilesPalette } = useTilesetPaletteCycle();

  const { getUsedPower, resetUsedPower } = useUsedPowerTracker({ levelId: state.levelId });

  // Demo/presentation: in dev builds allow free level hopping even when the debug overlay is closed.
  const allowDevLevelHop = isDev;

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  // Guards re-trying the backend-unlock workaround more than once per level.
  const stageStartRetryRef = useRef<Set<number>>(new Set());

  // Dedup win/lose handling per level.
  const handledWinLevelRef = useRef<number | null>(null);
  const handledLoseLevelRef = useRef<number | null>(null);

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  const completeDevWinStage = useCallback(
    async (lvl: number, usedPower: PowerKey | undefined): Promise<{ didReportBackend: boolean }> => {
      let didReportBackend = false;

      if (userId) {
        try {
          await apiCompleteStage(userId, lvl, usedPower);
          didReportBackend = true;
        } catch (err) {
          console.error(`Failed to report stage completion for ${lvl}:`, err);
        }
      }

      // Local progression cache for stage map rendering (also in logged-in mode).
      try {
        await completeLevel(lvl);
      } catch {
        // ignore local progress errors
      }

      return { didReportBackend };
    },
    [userId],
  );

  const runDevWinFlowWithRewardChoice = useCallback(
    (lvl: number) => {
      const usedPower: PowerKey | undefined = getUsedPower();

      void (async () => {
        // 1) Snapshot EXP state before reporting stage completion.
        let preMeta = readPlayerMeta(profile);

        if (userId) {
          const preProfile = await refreshProfile();
          preMeta = readPlayerMeta(preProfile) ?? preMeta;
        }

        const fromLevel = preMeta?.playerLevel ?? 1;
        const fromExpTotal = preMeta?.playerExp ?? 0;

        // 2) Report stage completion (backend awards EXP; local stage map cache updates).
        const { didReportBackend } = await completeDevWinStage(lvl, usedPower);

        // 3) Re-load profile to get post-win EXP (SSOT).
        let postMeta: { playerLevel: number; playerExp: number } | null = null;
        if (userId) {
          const postProfile = await refreshProfile();
          postMeta = readPlayerMeta(postProfile);
        }

        const { expPreview, didLevelUp } = buildExpPreview({
          enabled: Boolean(userId),
          fromLevel,
          fromExpTotal,
          didReportBackend,
          postMeta,
          expWinDelta: EXP_WIN_DELTA,
          expRequired: EXP_REQUIRED,
        });

        // Win-first UX: show Win overlay, then MissionReport, then optional LevelUp (reward selection).
        openWin({ level: lvl, mode: 'continue' });

        openMissionReport({
          expPreview,
          onDone: () => navigate('/game-map'),
        });

        if (didLevelUp) {
          openLevelUp({
            title: 'Choose your Reward!',
            onChoose: async (powerId) => {
              const backendPowerId = toBackendRewardPowerId(powerId);
              if (!backendPowerId) {
                console.warn(`Unexpected reward power id: ${String(powerId)}`);
                return;
              }

              const rewardAmount = WIN_POWER_REWARD_AMOUNT;
              const rewardDelta = buildRewardDelta(backendPowerId, rewardAmount);
              const rewardedPowers = addReward(powers, backendPowerId, rewardAmount);

              // 1) Immediate local reward update.
              setPowers(rewardedPowers);

              // 2) Preserve selected reward for next stage start API call.
              setSelectedPowersForNextStage(rewardDelta);

              // 3) Persist reward on backend (+2 guaranteed by business rule).
              if (userId) {
                try {
                  await updatePowers(rewardDelta, 'add');
                } catch (err) {
                  // Fallback for backends that don't support "add" reliably: set absolute next value.
                  try {
                    await updatePowers(buildRewardAbsolute(backendPowerId, rewardedPowers), 'set');
                  } catch {
                    console.error('Failed to persist win reward powers to backend:', err);
                  }
                }
              }

              // 4) After reward choice, return to map.
              navigate('/game-map');
            },
          });
        }
      })();
    },
    [
      completeDevWinStage,
      getUsedPower,
      navigate,
      openLevelUp,
      openMissionReport,
      openWin,
      powers,
      profile,
      refreshProfile,
      setPowers,
      setSelectedPowersForNextStage,
      updatePowers,
      userId,
    ],
  );

  const runDevLoseFlow = useCallback(
    async (lvl: number) => {
      if (userId) {
        try {
          const result = await apiLoseGame(userId);
          const nextPowers = extractPowersFromLoseResponse(result);
          if (nextPowers) setPowers(nextPowers);
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

      setSelectedPowersForNextStage(null);
      onDevSetLevel(1);
      openLose(lvl);
    },
    [onDevSetLevel, openLose, setPowers, setSelectedPowersForNextStage, userId],
  );

  const onDevWin = useCallback(() => {
    const lvl = state.levelId;
    handledWinLevelRef.current = lvl;
    runDevWinFlowWithRewardChoice(lvl);
  }, [runDevWinFlowWithRewardChoice, state.levelId]);

  const onDevLose = useCallback(async () => {
    const lvl = state.levelId;
    handledLoseLevelRef.current = lvl;
    await runDevLoseFlow(lvl);
  }, [runDevLoseFlow, state.levelId]);

  const onDevResetProgress = useCallback(async () => {
    // Guest mode only.
    if (!userId) {
      await resetProgress();
    }
  }, [userId]);

  // Backend: start stage with selected boosters whenever a level is loaded.
  useEffect(() => {
    if (!userId) return;

    const lvl = state.levelId;
    if (lvl <= 0) return;

    let cancelled = false;

    const start = async () => {
      // New stage => reset used power for new stage.
      resetUsedPower();

      try {
        const result = await apiStartStage(userId, lvl, selectedPowersForNextStage ?? undefined);
        if (cancelled) return;

        // SSOT sync: always trust backend stage-start powers (especially stage1 reset).
        setPowers(result.boosters);

        // Clear selected powers after they've been sent to backend.
        setSelectedPowersForNextStage(null);

        // Success => allow future retries for this level (if we come back later).
        stageStartRetryRef.current.delete(lvl);
        return;
      } catch (err) {
        if (cancelled) return;

        const allowedStage = extractAllowedStage(err);
        if (allowedStage && allowedStage !== lvl) {
          // IMPORTANT:
          // In demo/debug mode, ignore backend progression gating so level hopping works for presentations.
          if (allowDevLevelHop) {
            console.warn(`Start stage ${lvl} redirected to allowedStage=${allowedStage}. Dev mode: ignoring and running locally.`, err);
            setSelectedPowersForNextStage(null);
            return;
          }

          setSelectedPowersForNextStage(null);
          onDevSetLevel(allowedStage);
          navigate(`/game-map/play-game?level=${allowedStage}`, { replace: true });
          return;
        }

        const status = getHttpStatus(err);

        // DEV-friendly recovery:
        // If backend blocks stage start because previous stage isn't completed,
        // auto-report completion for (lvl-1) ONCE, then retry start ONCE.
        if (status === 403 && lvl > 1 && isPrevStageNotCompleted(err) && !stageStartRetryRef.current.has(lvl)) {
          stageStartRetryRef.current.add(lvl);

          try {
            await apiCompleteStage(userId, lvl - 1, undefined);
          } catch {
            // ignore: we will still attempt start; worst case we run locally
          }

          try {
            const result2 = await apiStartStage(userId, lvl, selectedPowersForNextStage ?? undefined);
            if (cancelled) return;

            setPowers(result2.boosters);
            setSelectedPowersForNextStage(null);
            return;
          } catch (err2) {
            console.warn(`Start stage ${lvl} blocked by backend (previous stage incomplete). Running locally.`, err2);
            setSelectedPowersForNextStage(null);
            return;
          }
        }

        if (status === 403) {
          console.warn(`Start stage ${lvl} rejected (${getHttpMessage(err)}). Running locally.`, err);
          setSelectedPowersForNextStage(null);
          return;
        }

        console.error(`Failed to start stage ${lvl}:`, err);
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [
    allowDevLevelHop,
    navigate,
    onDevSetLevel,
    resetUsedPower,
    selectedPowersForNextStage,
    setPowers,
    setSelectedPowersForNextStage,
    state.levelId,
    userId,
  ]);

  // React to engine outcome phases.
  useEffect(() => {
    const lvl = state.levelId;

    if (state.phase === 'win') {
      if (handledWinLevelRef.current === lvl) return;
      handledWinLevelRef.current = lvl;
      runDevWinFlowWithRewardChoice(lvl);
      return;
    }

    if (state.phase === 'lose') {
      if (handledLoseLevelRef.current === lvl) return;
      handledLoseLevelRef.current = lvl;
      void runDevLoseFlow(lvl);
    }
  }, [runDevLoseFlow, runDevWinFlowWithRewardChoice, state.levelId, state.phase]);

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
