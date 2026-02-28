import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { apiCompleteStage, apiLoseGame, apiStartStage } from '@/api/game';
import { useAuth } from '@/context/AuthContext';
import { usePowers } from '@/context/PowerContext';
import { POWER_CONSUME_EVENT, type PowerConsumeDetail } from '@/context/powerEvents';
import { cycleTilesetPalette, preloadTiles } from '@/features/grid/ui/tiles';
import { cycleSpecialTilesetPalette, preloadSpecialTiles } from '@/features/grid/ui/tilesSpecial';
import { useOverlays } from '@/features/overlays';
import { completeLevel, resetProgress } from '@/services/progress/progressActions';
import type { PowerKey, Powers, UserProfile } from '@/types';
import { findPossibleMatchSwaps } from '@/gamelogic/match';
import type { PossibleMatchSwap } from '@/gamelogic/match';

import { useDevHotkeys } from '../lib/useDevHotkeys';
import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { useMatch3Engine } from '../lib/useMatch3Engine';

import DevPanels from './DevPanels';
import GameContainer from './GameContainer';

type Props = {
  initialLevelId?: number;
};

type BackendRewardPowerId = Extract<PowerKey, 'bomb' | 'laser' | 'extraShuffle'>;
const WIN_POWER_REWARD_AMOUNT = 2;

const EXP_WIN_DELTA = 1000;
const EXP_REQUIRED = 3000;

function toBackendRewardPowerId(v: unknown): BackendRewardPowerId | null {
  if (v === 'bomb' || v === 'laser' || v === 'extraShuffle') return v;
  // UI alias (newer overlay): gridlaser reward should map to backend bomb inventory.
  if (v === 'gridlaser') return 'bomb';
  return null;
}

function toBackendPowerKey(key: unknown): PowerKey | null {
  if (key === 'bomb' || key === 'laser' || key === 'extraShuffle') return key;
  // Legacy alias: old UI used "gridlaser" for the bomb-like 3x3 item.
  if (key === 'gridlaser') return 'bomb';
  return null;
}

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

function extractAllowedStage(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;

  const maybePayload = (err as { payload?: unknown }).payload;
  if (!maybePayload || typeof maybePayload !== 'object') return null;

  const raw = (maybePayload as { allowedStage?: unknown }).allowedStage;
  if (typeof raw !== 'number') return null;
  if (!Number.isFinite(raw) || raw < 1) return null;

  return Math.floor(raw);
}

function safeInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n | 0;
}

function addReward(base: Powers, powerId: BackendRewardPowerId, amount: number): Powers {
  const add = safeInt(amount);
  if (powerId === 'bomb') return { ...base, bomb: (base.bomb ?? 0) + add };
  if (powerId === 'laser') return { ...base, laser: (base.laser ?? 0) + add };
  return { ...base, extraShuffle: (base.extraShuffle ?? 0) + add };
}

function buildRewardDelta(powerId: BackendRewardPowerId, amount: number): Partial<Powers> {
  const add = safeInt(amount);
  if (powerId === 'bomb') return { bomb: add };
  if (powerId === 'laser') return { laser: add };
  return { extraShuffle: add };
}

function buildRewardAbsolute(powerId: BackendRewardPowerId, next: Powers): Partial<Powers> {
  if (powerId === 'bomb') return { bomb: safeInt(next.bomb ?? 0) };
  if (powerId === 'laser') return { laser: safeInt(next.laser ?? 0) };
  return { extraShuffle: safeInt(next.extraShuffle ?? 0) };
}

function extractPowersFromLoseResponse(res: unknown): Powers | null {
  if (!res || typeof res !== 'object') return null;
  const rec = res as Record<string, unknown>;
  const powers = rec.powers;
  if (!powers || typeof powers !== 'object') return null;
  return powers as Powers;
}

function readPlayerMeta(p: UserProfile | null | undefined): { playerLevel: number; playerExp: number } | null {
  if (!p) return null;

  const lvlRaw = p.playerLevel;
  const expRaw = p.playerExp;

  const playerLevel = Number.isFinite(lvlRaw) ? Math.max(1, Math.floor(lvlRaw)) : 1;
  const playerExp = Number.isFinite(expRaw) ? Math.max(0, Math.floor(expRaw)) : 0;

  return { playerLevel, playerExp };
}

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
  const navigate = useNavigate();

  const [showLockoutHints, setShowLockoutHints] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

  // DevTools: match hints overlay toggle
  const [showMatches, setShowMatches] = useState(false);

  // Dev-only: force rerender when changing tiles palette (palette lives in module state).
  const [tilesVersion, setTilesVersion] = useState(0);

  // Ref (no state) => avoids rerenders.
  const usedPowerInCurrentStageRef = useRef<PowerKey | null>(null);

  const { openWin, openLose, openPowerChoice } = useOverlays();
  const { user, profile, refreshProfile, updatePowers } = useAuth();
  const userId = user?.id ?? null;
  const { powers, setPowers, selectedPowersForNextStage, setSelectedPowersForNextStage } = usePowers();

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevFixedSeed, onDevNextLevel, onDevPrevLevel, onDevSetLevel, events } = useMatch3Engine({
    initialLevelId,
  });

  // DevTools-only: compute match swaps (read-only)
  const matchSwaps = useMemo<readonly PossibleMatchSwap[]>(() => {
    if (!isDev || !debugEnabled) return [];
    return findPossibleMatchSwaps(state);
  }, [debugEnabled, isDev, state.cells, state.height, state.pieces, state.width]);

  // Demo/presentation: in dev builds allow free level hopping even when the debug overlay is closed.
  const allowDevLevelHop = isDev;

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  // Guards re-trying the backend-unlock workaround more than once per level.
  const stageStartRetryRef = useRef<Set<number>>(new Set());

  // Dedup win/lose handling per level.
  const handledWinLevelRef = useRef<number | null>(null);
  const handledLoseLevelRef = useRef<number | null>(null);

  // Reset "used power" when level changes (no render, no cascading effects).
  useEffect(() => {
    usedPowerInCurrentStageRef.current = null;
  }, [state.levelId]);

  // Track power consumption during gameplay.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume = (e: Event) => {
      const ce = e as CustomEvent<PowerConsumeDetail>;
      const detail = ce.detail;
      if (!detail) return;

      const backendPowerKey = toBackendPowerKey(detail.key);
      if (!backendPowerKey) return;

      // Store the power that was used (only first used power per stage).
      if (!usedPowerInCurrentStageRef.current) {
        usedPowerInCurrentStageRef.current = backendPowerKey;
      }
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
  }, []);

  useDevHotkeys({
    enabled: isDev,
    onToggle: () => {
      // Toggle DevTools overlay (debugEnabled). When opening, auto-enable match hints.
      setDebugEnabled((prev) => {
        const next = !prev;
        if (next) setShowMatches(true);
        return next;
      });
    },
  });

  // When DevTools closes, also close the match overlay (keeps UI consistent).
  useEffect(() => {
    if (debugEnabled) return;
    setShowMatches(false);
  }, [debugEnabled]);

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  const onDevNextTilesPalette = useCallback(() => {
    cycleTilesetPalette();
    cycleSpecialTilesetPalette();
    preloadTiles();
    preloadSpecialTiles();
    setTilesVersion((v) => (v + 1) | 0);
  }, []);

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
      const usedPower: PowerKey | undefined = usedPowerInCurrentStageRef.current ?? undefined;

      void (async () => {
        // Final stage keeps original behavior: no reward selection.
        if (lvl === 12) {
          setSelectedPowersForNextStage(null);
          await completeDevWinStage(lvl, usedPower);
          if (userId) await refreshProfile();
          openWin(lvl);
          return;
        }

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

        const hasVerifiedPost = didReportBackend && postMeta !== null;

        const gained = Math.floor((fromExpTotal + EXP_WIN_DELTA) / EXP_REQUIRED) - Math.floor(fromExpTotal / EXP_REQUIRED);

        const toLevel = hasVerifiedPost ? postMeta.playerLevel : fromLevel + Math.max(0, gained);
        const toExpTotal = hasVerifiedPost ? postMeta.playerExp : fromExpTotal + EXP_WIN_DELTA;
                const expDelta = Math.max(0, toExpTotal - fromExpTotal);

        // Win-first UX: show Win overlay, then queue PowerChoice (reward selection).
        openWin({ level: lvl, mode: 'continue' });

        openPowerChoice({
          title: 'Choose your Reward!',
          expPreview: userId
            ? {
                fromLevel,
                fromExpTotal,
                toLevel,
                toExpTotal,
                expRequired: EXP_REQUIRED,
                expDelta: expDelta > 0 ? expDelta : EXP_WIN_DELTA,
              }
            : undefined,
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

            // 4) After reward choice, return to map (Win overlay was already shown).
            navigate('/game-map');
          },
        });
      })();
    },
    [completeDevWinStage, navigate, openPowerChoice, openWin, powers, profile, refreshProfile, setPowers, setSelectedPowersForNextStage, updatePowers, userId],
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
      usedPowerInCurrentStageRef.current = null;

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
  }, [allowDevLevelHop, navigate, onDevSetLevel, selectedPowersForNextStage, setPowers, setSelectedPowersForNextStage, state.levelId, userId]);

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
      <DevPanels enabled={isDev && debugEnabled} events={events} onDevWin={onDevWin} onDevLose={onDevLose} onDevResetProgress={onDevResetProgress} onDevFixedSeed={onDevFixedSeed} />

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
        onToggleShowMatches={() => setShowMatches((v) => !v)}
        onToggleShowLockoutHints={() => setShowLockoutHints((v) => !v)}
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
