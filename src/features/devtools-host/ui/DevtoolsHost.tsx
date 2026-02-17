// src/features/devtools-host/ui/DevtoolsHost.tsx
import { useCallback, useEffect, useRef, useState } from 'react';

import { cycleTilesetPalette, preloadTiles } from '@/features/grid/ui/tiles';
import { cycleSpecialTilesetPalette, preloadSpecialTiles } from '@/features/grid/ui/tilesSpecial';
import { useOverlays } from '@/features/overlays';
import { completeLevel, resetProgress } from '@/services/progress/progressActions';
import { useAuth } from '@/context/AuthContext';
import { usePowers } from '@/context/PowerContext';
import { apiStartStage, apiCompleteStage } from '@/api/game';
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

function getHttpStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const rec = err as Record<string, unknown>;
  const s = rec.status;
  if (typeof s === 'number' && Number.isFinite(s)) return s | 0;
  return null;
}

function getHttpMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== 'object') return String(err);
  const rec = err as Record<string, unknown>;
  const m = rec.message;
  if (typeof m === 'string') return m;
  return String(err);
}

function isPrevStageNotCompleted(err: unknown): boolean {
  const msg = getHttpMessage(err);
  return /previous\s+stage\s+not\s+completed/i.test(msg);
}

function bumpPower(p: Powers, key: PowerKey, add: number): Powers {
  const bomb = p.bomb ?? 0;
  const laser = p.laser ?? 0;
  const extraShuffle = p.extraShuffle ?? 0;

  if (key === 'bomb') return { ...p, bomb: bomb + add };
  if (key === 'laser') return { ...p, laser: laser + add };
  return { ...p, extraShuffle: extraShuffle + add };
}

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(false);
  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);

  // Ref (no state) => avoids "setState synchronously within an effect" + avoids rerenders.
  const usedPowerInCurrentStageRef = useRef<PowerKey | null>(null);

  const { openWin, openLose, openPowerChoice } = useOverlays();
  const { user, updatePowers } = useAuth();
  const { powers, setPowers, selectedPowersForNextStage, setSelectedPowersForNextStage } = usePowers();

  const userId = user?.id ?? null;

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevNextLevel, onDevPrevLevel, onDevSetLevel, events } = useMatch3Engine({
    initialLevelId,
  });

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  // Guards re-trying the backend-unlock workaround more than once per level.
  const stageStartRetryRef = useRef<Set<number>>(new Set());

  // Reset "used power" when level changes (no render, no cascading effects).
  useEffect(() => {
    usedPowerInCurrentStageRef.current = null;
  }, [state.levelId]);

  // Track power consumption during gameplay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume = (e: Event) => {
      const ce = e as CustomEvent<PowerConsumeDetail>;
      const detail = ce.detail;
      if (!detail) return;

      // Store the power that was used (only first used power per stage)
      if (usedPowerInCurrentStageRef.current === null) {
        usedPowerInCurrentStageRef.current = detail.key;
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

  const beginWinRewardFlow = useCallback(
    (lvl: number) => {
      const usedPower: PowerKey | undefined = usedPowerInCurrentStageRef.current ?? undefined;

      // Skip power selection for stage 12 (final stage)
      if (lvl === 12) {
        // Report stage completion with used power
        if (userId) {
          apiCompleteStage(userId, lvl, usedPower).catch((err) => {
            console.error(`Failed to report stage completion for ${lvl}:`, err);
          });
        }

        // Mark level completed locally
        completeLevel(lvl).catch(() => {});

        // Clear any previously selected powers
        setSelectedPowersForNextStage(null);

        // Show Win overlay directly
        openWin(lvl);
        return;
      }

      openPowerChoice({
        title: 'Choose your Power!',
        onChoose: async (powerId) => {
          const add = powerId === 'bomb' ? 2 : 1;

          // 1) Optimistic local powers update (immediate feedback)
          //    (setPowers is not a React.Dispatch in your context -> no functional updater)
          const nextPowers = bumpPower(powers, powerId, add);
          setPowers(nextPowers);

          // 2) Store selected powers for next stage
          const selectedForNextStage: Partial<Powers> = { [powerId]: add };
          setSelectedPowersForNextStage(selectedForNextStage);

          // 3) Persist reward for logged-in users (best-effort)
          if (userId) {
            const delta = powerId === 'bomb' ? { bomb: add } : powerId === 'laser' ? { laser: add } : { extraShuffle: add };

            try {
              await updatePowers(delta, 'add');
            } catch {
              // ignore (offline / backend issues)
            }
          }

          // 4) Report stage completion with used power
          if (userId) {
            try {
              await apiCompleteStage(userId, lvl, usedPower);
            } catch (err) {
              console.error(`Failed to report stage completion for ${lvl}:`, err);
            }
          }

          // 5) Mark level completed locally (unlocks next level in local map)
          try {
            await completeLevel(lvl);
          } catch {
            // ignore (localStorage)
          }

          // 6) Show Win overlay (PowerChoice overlay auto-closes right after click)
          openWin(lvl);
        },
      });
    },
    [openPowerChoice, openWin, powers, setPowers, setSelectedPowersForNextStage, updatePowers, userId],
  );

  const onDevWin = async () => {
    const lvl = state.levelId;

    // prevent double-trigger if the engine is already in win phase for this lvl
    handledWinLevelRef.current = lvl;

    // IMPORTANT: do NOT openWin directly; go through PowerChoice flow
    beginWinRewardFlow(lvl);
  };

  const onDevLose = async () => {
    const lvl = state.levelId;
    await resetProgress();
    onDevSetLevel(1);
    openLose(lvl);
  };

  const onDevResetProgress = async () => {
    await resetProgress();
  };

  // Call apiStartStage with selected powers when a level is loaded
  useEffect(() => {
    if (!userId) return;

    const lvl = state.levelId;
    if (lvl <= 0) return;

    let cancelled = false;

    const start = async () => {
      try {
        await apiStartStage(userId, lvl, selectedPowersForNextStage ?? undefined);

        if (cancelled) return;

        // Clear selected powers after they've been sent to backend
        setSelectedPowersForNextStage(null);

        // Success => allow future retries for this level (if we come back later)
        stageStartRetryRef.current.delete(lvl);
        return;
      } catch (err) {
        if (cancelled) return;

        const status = getHttpStatus(err);

        // DEV-friendly recovery:
        // If the backend blocks stage start because the previous stage isn't completed,
        // auto-report completion for (lvl-1) once, then retry start once.
        if (status === 403 && lvl > 1 && isPrevStageNotCompleted(err) && !stageStartRetryRef.current.has(lvl)) {
          stageStartRetryRef.current.add(lvl);

          try {
            await apiCompleteStage(userId, lvl - 1, undefined);
          } catch {
            // ignore: we will still attempt start; worst case we run locally
          }

          try {
            await apiStartStage(userId, lvl, selectedPowersForNextStage ?? undefined);

            if (cancelled) return;

            setSelectedPowersForNextStage(null);
            return;
          } catch (err2) {
            console.warn(`Start stage ${lvl} blocked by backend (previous stage incomplete). Running locally.`, err2);
            return;
          }
        }

        if (status === 403) {
          console.warn(`Start stage ${lvl} rejected (${getHttpMessage(err)}). Running locally.`, err);
          return;
        }

        console.error(`Failed to start stage ${lvl}:`, err);
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [userId, state.levelId, selectedPowersForNextStage, setSelectedPowersForNextStage]);

  useEffect(() => {
    const lvl = state.levelId;

    if (state.phase === 'win') {
      if (handledWinLevelRef.current === lvl) return;
      handledWinLevelRef.current = lvl;

      beginWinRewardFlow(lvl);
      return;
    }

    if (state.phase === 'lose') {
      if (handledLoseLevelRef.current === lvl) return;
      handledLoseLevelRef.current = lvl;

      void (async () => {
        try {
          await resetProgress();
        } catch {
          // ignore (localStorage)
        }
        openLose(lvl);
      })();

      return;
    }
  }, [state.phase, state.levelId, beginWinRewardFlow, openLose]);

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
