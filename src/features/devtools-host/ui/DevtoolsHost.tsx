import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { cycleTilesetPalette, preloadTiles } from '@/features/grid/ui/tiles';
import { cycleSpecialTilesetPalette, preloadSpecialTiles } from '@/features/grid/ui/tilesSpecial';
import { useOverlays } from '@/features/overlays';
import { completeLevel, resetProgress } from '@/services/progress/progressActions';
import { useAuth } from '@/context/AuthContext';
import { getChoiceBonus, usePowers } from '@/context/PowerContext';
import { apiStartStage, apiCompleteStage, apiLoseGame } from '@/api/game';
import type { Powers, PowerKey } from '@/types';
import { POWER_CONSUME_EVENT, type PowerConsumeDetail } from '@/context/powerEvents';

import { useDevHotkeys } from '../lib/useDevHotkeys';
import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { useMatch3Engine } from '../lib/useMatch3Engine';

import DevPanels from './DevPanels';
import GameContainer from './GameContainer';

type Props = {
  initialLevelId?: number;
};

type RewardPowerId = 'bomb' | 'laser' | 'extraShuffle';

function toBackendPowerKey(key: unknown): PowerKey | null {
  if (key === 'bomb' || key === 'laser' || key === 'extraShuffle') return key;
  if (key === 'gridlaser') return 'bomb';
  return null;
}

function extractAllowedStage(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;

  const maybePayload = (err as { payload?: unknown }).payload;
  if (!maybePayload || typeof maybePayload !== 'object') return null;

  const raw = (maybePayload as { allowedStage?: unknown }).allowedStage;
  if (typeof raw !== 'number') return null;
  if (!Number.isFinite(raw) || raw < 1) return null;

  return Math.floor(raw);
}

function buildPowerRewardDelta(powerId: RewardPowerId, amount: number): Partial<Powers> {
  if (powerId === 'bomb') return { bomb: amount };
  if (powerId === 'laser') return { laser: amount };
  return { extraShuffle: amount };
}

function applyPowerReward(base: Powers, powerId: RewardPowerId, amount: number): Powers {
  if (powerId === 'bomb') return { ...base, bomb: base.bomb + amount };
  if (powerId === 'laser') return { ...base, laser: base.laser + amount };
  return { ...base, extraShuffle: base.extraShuffle + amount };
}

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
  const navigate = useNavigate();
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(false);
  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);
  const usedPowerInCurrentStageRef = useRef<PowerKey | null>(null);

  const { openWin, openLose, openPowerChoice } = useOverlays();
  const { user, updatePowers } = useAuth();
  const userId = user?.id;
  const { powers, setPowers, selectedPowersForNextStage, setSelectedPowersForNextStage } = usePowers();

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevNextLevel, onDevPrevLevel, onDevSetLevel, events } = useMatch3Engine({
    initialLevelId,
  });

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  // Track power consumption during gameplay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume = (e: Event) => {
      const ce = e as CustomEvent<PowerConsumeDetail>;
      const detail = ce.detail;
      if (!detail) return;
      const backendPowerKey = toBackendPowerKey(detail.key);
      if (!backendPowerKey) return;

      // Store the power that was used (only first used power per stage)
      if (!usedPowerInCurrentStageRef.current) {
        usedPowerInCurrentStageRef.current = backendPowerKey;
      }
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
  }, []);

  useDevHotkeys({
    enabled: isDev,
    onToggle: () => setDebugEnabled((v) => !v),
  });

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  // Dev-only: force rerender when changing tiles palette (palette lives in module state)
  const [tilesVersion, setTilesVersion] = useState(0);

  const onDevNextTilesPalette = () => {
    cycleTilesetPalette();
    cycleSpecialTilesetPalette();
    preloadTiles();
    preloadSpecialTiles();
    setTilesVersion((v) => (v + 1) | 0);
  };

  const handledWinLevelRef = useRef<number | null>(null);
  const handledLoseLevelRef = useRef<number | null>(null);
  const completeDevWinStage = useCallback(
    async (lvl: number) => {
      if (userId) {
        try {
          const usedPower = usedPowerInCurrentStageRef.current ?? undefined;
          await apiCompleteStage(userId, lvl, usedPower);
        } catch (err) {
          console.error(`Failed to report dev win for ${lvl}:`, err);
        }
      }

      try {
        await completeLevel(lvl);
      } catch {
        // ignore local progress errors
      }

      setSelectedPowersForNextStage(null);
      openWin(lvl);
    },
    [openWin, setSelectedPowersForNextStage, userId],
  );

  const runDevWinFlowWithRewardChoice = useCallback(
    (lvl: number) => {
      // Final stage keeps original behavior: no reward selection.
      if (lvl === 12) {
        void completeDevWinStage(lvl);
        return;
      }

      openPowerChoice({
        title: 'Choose your Power!',
        onChoose: async (powerId) => {
          const selectedPower = powerId as RewardPowerId;
          const rewardAmount = getChoiceBonus(selectedPower);
          const rewardDelta = buildPowerRewardDelta(selectedPower, rewardAmount);
          const rewardedPowers = applyPowerReward(powers, selectedPower, rewardAmount);

          // 1) Immediate local reward update.
          setPowers(rewardedPowers);
          // 2) Preserve selected reward for next stage start API call.
          setSelectedPowersForNextStage(rewardDelta);

          // 3) Persist reward on backend (best effort).
          if (userId) {
            try {
              await updatePowers(rewardDelta, 'add');
            } catch {
              // ignore backend sync failures in dev flow
            }
          }

          // 4) Complete stage (backend + local progress + Win overlay).
          await completeDevWinStage(lvl);
        },
      });
    },
    [completeDevWinStage, openPowerChoice, powers, setPowers, setSelectedPowersForNextStage, updatePowers, userId],
  );

  const runDevLoseFlow = useCallback(
    async (lvl: number) => {
      if (userId) {
        try {
          const result = (await apiLoseGame(userId)) as { powers?: Powers };
          if (result?.powers) {
            setPowers(result.powers);
          }
        } catch (err) {
          console.error(`Failed to report dev lose for ${lvl}:`, err);
        }
      }

      await resetProgress();
      setSelectedPowersForNextStage(null);
      onDevSetLevel(1);
      openLose(lvl);
    },
    [onDevSetLevel, openLose, setPowers, setSelectedPowersForNextStage, userId],
  );

  // const beginWinRewardFlow = useCallback(
  //   (lvl: number) => {
  //     // Skip power selection for stage 12 (final stage)
  //     if (lvl === 12) {
  //       // Report stage completion with used power
  //       if (user?.id) {
  //         const usedPower = usedPowerInCurrentStage as PowerKey | undefined;
  //         apiCompleteStage(user.id, lvl, usedPower).catch((err) => {
  //           console.error(`Failed to report stage completion for ${lvl}:`, err);
  //         });
  //       }
  //       // Mark level completed locally
  //       completeLevel(lvl).catch(() => {});
  //       // Clear any previously selected powers
  //       setSelectedPowersForNextStage(null);
  //       // Show Win overlay directly
  //       openWin(lvl);
  //       return;
  //     }

  //     openPowerChoice({
  //       title: 'Choose your Power!',
  //       onChoose: async (powerId) => {
  //         const add = powerId === 'bomb' ? 2 : 1;

  //         // 1) Optimistic local powers update (immediate feedback)
  //         const nextPowers =
  //           powerId === 'bomb'
  //             ? { ...powers, bomb: powers.bomb + add }
  //             : powerId === 'laser'
  //               ? { ...powers, laser: powers.laser + add }
  //               : { ...powers, extraShuffle: powers.extraShuffle + add };

  //         setPowers(nextPowers);

  //         // 2) Store selected powers for next stage
  //         const selectedForNextStage: Partial<Powers> = {
  //           [powerId]: add,
  //         };
  //         setSelectedPowersForNextStage(selectedForNextStage);

  //         // 3) Persist reward for logged-in users (best-effort)
  //         if (user?.id) {
  //           const delta = powerId === 'bomb' ? { bomb: add } : powerId === 'laser' ? { laser: add } : { extraShuffle: add };

  //           try {
  //             await updatePowers(delta, 'add');
  //           } catch {
  //             // ignore (offline / backend issues)
  //           }
  //         }

  //         // 4) Report stage completion with used power
  //         if (user?.id) {
  //           const usedPower = usedPowerInCurrentStage as PowerKey | undefined;
  //           try {
  //             await apiCompleteStage(user.id, lvl, usedPower);
  //           } catch (err) {
  //             console.error(`Failed to report stage completion for ${lvl}:`, err);
  //           }
  //         }

  //         // 5) Mark level completed locally (unlocks next level in local map)
  //         try {
  //           await completeLevel(lvl);
  //         } catch {
  //           // ignore (localStorage)
  //         }

  //         // 6) Show Win overlay (PowerChoice overlay auto-closes right after click)
  //         openWin(lvl);
  //       },
  //     });
  //   },
  //   [openPowerChoice, powers, setPowers, user?.id, updatePowers, openWin, setSelectedPowersForNextStage, usedPowerInCurrentStage],
  // );

  const onDevWin = async () => {
    // Legacy onDevWin (kept for reference):
    const lvl = state.levelId;

    // prevent double-trigger if the engine is already in win phase for this lvl
    handledWinLevelRef.current = lvl;

    // IMPORTANT: do NOT openWin directly; go through PowerChoice flow
    // beginWinRewardFlow(lvl);
    runDevWinFlowWithRewardChoice(lvl);
  };

  const onDevLose = async () => {
    // Legacy onDevLose (kept for reference):
    const lvl = state.levelId;
    handledLoseLevelRef.current = lvl;
    // await resetProgress();
    // onDevSetLevel(1);
    // openLose(lvl);
    await runDevLoseFlow(lvl);
  };

  const onDevResetProgress = async () => {
    await resetProgress();
  };

  // Call apiStartStage with selected powers when a level is loaded
  useEffect(() => {
    if (!user?.id) return;

    const lvl = state.levelId;
    if (lvl <= 0) return;

    // Reset used power for new stage
    usedPowerInCurrentStageRef.current = null;

    // Call apiStartStage with selected powers (if any)
    apiStartStage(user.id, lvl, selectedPowersForNextStage ?? undefined)
      .then((result) => {
        // SSOT sync: always trust backend stage-start powers (especially stage1 reset).
        if (result?.boosters) {
          setPowers(result.boosters);
        }

        // Clear selected powers after they've been sent to backend
        setSelectedPowersForNextStage(null);
      })
      .catch((err) => {
        const allowedStage = extractAllowedStage(err);
        if (allowedStage && allowedStage !== lvl) {
          onDevSetLevel(allowedStage);
          navigate(`/game-map/play-game?level=${allowedStage}`, { replace: true });
          return;
        }

        console.error(`Failed to start stage ${lvl}:`, err);
      });
  }, [navigate, onDevSetLevel, setPowers, user?.id, state.levelId, selectedPowersForNextStage, setSelectedPowersForNextStage]);

  useEffect(() => {
    const lvl = state.levelId;

    if (state.phase === 'win') {
      if (handledWinLevelRef.current === lvl) return;
      handledWinLevelRef.current = lvl;

      // beginWinRewardFlow(lvl);
      runDevWinFlowWithRewardChoice(lvl);
      return;
    }

    if (state.phase === 'lose') {
      if (handledLoseLevelRef.current === lvl) return;
      handledLoseLevelRef.current = lvl;

      void (async () => {
        // try {
        //   await resetProgress();
        // } catch {
        //   // ignore (localStorage)
        // }
        // openLose(lvl);
        runDevLoseFlow(lvl);
      })();

      return;
    }
    // }, [state.phase, state.levelId, beginWinRewardFlow, openLose]);
  }, [state.phase, state.levelId, runDevWinFlowWithRewardChoice, runDevLoseFlow]);

  // defensive: when leaving dev mode, reset the top-offset CSS var
  useEffect(() => {
    if (isDev && debugEnabled) return;
    document.documentElement.style.removeProperty('--dev-panels-top');
  }, [isDev, debugEnabled]);

  return (
    <div className="w-full h-full">
      <DevPanels enabled={isDev && debugEnabled} events={events} onDevWin={onDevWin} onDevLose={onDevLose} onDevResetProgress={onDevResetProgress} />

      <GameContainer
        state={state}
        inputLocked={inputLocked}
        canSwapAt={canSwapAt}
        onIntent={onIntent}
        isDev={isDev}
        debugEnabled={debugEnabled}
        showLockoutHints={showLockoutHints}
        onToggleShowLockoutHints={() => setShowLockoutHints((v) => !v)}
        onDevResetBoard={onDevResetBoard}
        onDevPrevLevel={onDevPrevLevel}
        onDevNextLevel={onDevNextLevel}
        onDevNextTilesPalette={onDevNextTilesPalette}
        gridRowRef={gridRowRef}
        tilesVersion={tilesVersion}
      />
    </div>
  );
}
