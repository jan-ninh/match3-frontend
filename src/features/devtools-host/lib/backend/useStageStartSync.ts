// src/features/devtools-host/lib/backend/useStageStartSync.ts
import { useEffect, useRef } from 'react';

import { apiCompleteStage, apiStartStage } from '@/api/game';
import type { Powers } from '@/types';

import { extractAllowedStage, getHttpMessage, getHttpStatus, isPrevStageNotCompleted } from './httpError';

export type NavigateFn = (to: string, opts?: { replace?: boolean }) => void;

export function useStageStartSync(args: {
  userId: string | null;
  levelId: number;
  selectedPowersForNextStage: Partial<Powers> | null;
  allowDevLevelHop: boolean;
  navigate: NavigateFn;
  onDevSetLevel: (lvl: number) => void;
  setPowers: (powers: Powers) => void;
  setSelectedPowersForNextStage: (v: Partial<Powers> | null) => void;
  resetUsedPower: () => void;
}): void {
  // Guards re-trying the backend-unlock workaround more than once per level.
  const stageStartRetryRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!args.userId) return;

    const lvl = args.levelId;
    if (lvl <= 0) return;

    let cancelled = false;

    const start = async () => {
      // New stage => reset used power for new stage.
      args.resetUsedPower();

      try {
        const result = await apiStartStage(args.userId, lvl, args.selectedPowersForNextStage ?? undefined);
        if (cancelled) return;

        // SSOT sync: always trust backend stage-start powers (especially stage1 reset).
        args.setPowers(result.boosters);

        // Clear selected powers after they've been sent to backend.
        args.setSelectedPowersForNextStage(null);

        // Success => allow future retries for this level (if we come back later).
        stageStartRetryRef.current.delete(lvl);
        return;
      } catch (err) {
        if (cancelled) return;

        const allowedStage = extractAllowedStage(err);
        if (allowedStage && allowedStage !== lvl) {
          // IMPORTANT:
          // In demo/debug mode, ignore backend progression gating so level hopping works for presentations.
          if (args.allowDevLevelHop) {
            console.warn(
              `Start stage ${lvl} redirected to allowedStage=${allowedStage}. Dev mode: ignoring and running locally.`,
              err,
            );
            args.setSelectedPowersForNextStage(null);
            return;
          }

          args.setSelectedPowersForNextStage(null);
          args.onDevSetLevel(allowedStage);
          args.navigate(`/game-map/play-game?level=${allowedStage}`, { replace: true });
          return;
        }

        const status = getHttpStatus(err);

        // DEV-friendly recovery:
        // If backend blocks stage start because previous stage isn't completed,
        // auto-report completion for (lvl-1) ONCE, then retry start ONCE.
        if (status === 403 && lvl > 1 && isPrevStageNotCompleted(err) && !stageStartRetryRef.current.has(lvl)) {
          stageStartRetryRef.current.add(lvl);

          try {
            await apiCompleteStage(args.userId, lvl - 1, undefined);
          } catch {
            // ignore: we will still attempt start; worst case we run locally
          }

          try {
            const result2 = await apiStartStage(args.userId, lvl, args.selectedPowersForNextStage ?? undefined);
            if (cancelled) return;

            args.setPowers(result2.boosters);
            args.setSelectedPowersForNextStage(null);
            return;
          } catch (err2) {
            console.warn(`Start stage ${lvl} blocked by backend (previous stage incomplete). Running locally.`, err2);
            args.setSelectedPowersForNextStage(null);
            return;
          }
        }

        if (status === 403) {
          console.warn(`Start stage ${lvl} rejected (${getHttpMessage(err)}). Running locally.`, err);
          args.setSelectedPowersForNextStage(null);
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
    args.allowDevLevelHop,
    args.levelId,
    args.navigate,
    args.onDevSetLevel,
    args.resetUsedPower,
    args.selectedPowersForNextStage,
    args.setPowers,
    args.setSelectedPowersForNextStage,
    args.userId,
  ]);
}
