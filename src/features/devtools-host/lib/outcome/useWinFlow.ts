// src/features/devtools-host/lib/outcome/useWinFlow.ts
import { useCallback } from 'react';

import { apiCompleteStage } from '@/api/game';
import { completeLevel } from '@/services/progress/progressActions';
import type { PowerKey, Powers, UserProfile } from '@/types';

import { buildExpPreview, type ExpPreview } from './expPreview';
import { readPlayerMeta } from './playerMeta';
import { EXP_REQUIRED, EXP_WIN_DELTA, WIN_POWER_REWARD_AMOUNT } from './winFlowConfig';
import { toBackendRewardPowerId } from '../powers/rewardMapping';
import { addReward, buildRewardAbsolute, buildRewardDelta } from '../powers/rewardMath';

type OpenWinFn = (args: { level: number; mode: 'continue' }) => void;
type OpenMissionReportFn = (args: { expPreview?: ExpPreview; onDone: () => void }) => void;
type OpenLevelUpFn = (args: { title: string; onChoose: (powerId: unknown) => void }) => void;

export function useWinFlow(args: {
  userId: string | null;
  profile: UserProfile | null;
  refreshProfile: () => Promise<UserProfile | null>;
  updatePowers: (delta: Partial<Powers>, mode: 'add' | 'set') => Promise<void>;
  powers: Powers;
  setPowers: (powers: Powers) => void;
  setSelectedPowersForNextStage: (v: Partial<Powers> | null) => void;

  getUsedPower: () => PowerKey | undefined;

  openWin: OpenWinFn;
  openMissionReport: OpenMissionReportFn;
  openLevelUp: OpenLevelUpFn;

  navigate: (to: string) => void;
}): { runWinFlow: (lvl: number) => void } {
  const completeDevWinStage = useCallback(
    async (lvl: number, usedPower: PowerKey | undefined): Promise<{ didReportBackend: boolean }> => {
      let didReportBackend = false;

      if (args.userId) {
        try {
          await apiCompleteStage(args.userId, lvl, usedPower);
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
    [args.userId],
  );

  const runWinFlow = useCallback(
    (lvl: number) => {
      const usedPower: PowerKey | undefined = args.getUsedPower();

      void (async () => {
        // 1) Snapshot EXP state before reporting stage completion.
        let preMeta = readPlayerMeta(args.profile);

        if (args.userId) {
          const preProfile = await args.refreshProfile();
          preMeta = readPlayerMeta(preProfile) ?? preMeta;
        }

        const fromLevel = preMeta?.playerLevel ?? 1;
        const fromExpTotal = preMeta?.playerExp ?? 0;

        // 2) Report stage completion (backend awards EXP; local stage map cache updates).
        const { didReportBackend } = await completeDevWinStage(lvl, usedPower);

        // 3) Re-load profile to get post-win EXP (SSOT).
        let postMeta: { playerLevel: number; playerExp: number } | null = null;
        if (args.userId) {
          const postProfile = await args.refreshProfile();
          postMeta = readPlayerMeta(postProfile);
        }

        const { expPreview, didLevelUp } = buildExpPreview({
          enabled: Boolean(args.userId),
          fromLevel,
          fromExpTotal,
          didReportBackend,
          postMeta,
          expWinDelta: EXP_WIN_DELTA,
          expRequired: EXP_REQUIRED,
        });

        // Win-first UX: show Win overlay, then MissionReport, then optional LevelUp (reward selection).
        args.openWin({ level: lvl, mode: 'continue' });

        args.openMissionReport({
          expPreview,
          onDone: () => args.navigate('/game-map'),
        });

        if (didLevelUp) {
          args.openLevelUp({
            title: 'Choose your Reward!',
            onChoose: async (powerId) => {
              const backendPowerId = toBackendRewardPowerId(powerId);
              if (!backendPowerId) {
                console.warn(`Unexpected reward power id: ${String(powerId)}`);
                return;
              }

              const rewardAmount = WIN_POWER_REWARD_AMOUNT;
              const rewardDelta = buildRewardDelta(backendPowerId, rewardAmount);
              const rewardedPowers = addReward(args.powers, backendPowerId, rewardAmount);

              // 1) Immediate local reward update.
              args.setPowers(rewardedPowers);

              // 2) Preserve selected reward for next stage start API call.
              args.setSelectedPowersForNextStage(rewardDelta);

              // 3) Persist reward on backend (+2 guaranteed by business rule).
              if (args.userId) {
                try {
                  await args.updatePowers(rewardDelta, 'add');
                } catch (err) {
                  // Fallback for backends that don't support "add" reliably: set absolute next value.
                  try {
                    await args.updatePowers(buildRewardAbsolute(backendPowerId, rewardedPowers), 'set');
                  } catch {
                    console.error('Failed to persist win reward powers to backend:', err);
                  }
                }
              }

              // 4) After reward choice, return to map.
              args.navigate('/game-map');
            },
          });
        }
      })();
    },
    [
      args,
      completeDevWinStage,
    ],
  );

  return { runWinFlow };
}
