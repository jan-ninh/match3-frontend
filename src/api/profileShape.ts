import type { UserProfile, Powers } from '@/types';
import { RequestError } from './transport.ts';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
export function readPowers(value: unknown): Powers {
  if (!record(value) || !['bomb', 'laser', 'extraShuffle'].every((k) => count(value[k]))) throw new RequestError('protocol');
  return { bomb: Number(value.bomb), laser: Number(value.laser), extraShuffle: Number(value.extraShuffle) };
}
export type CanonicalPowers = { bomb: number; laser: number; extraShuffle: number };
export type ActiveAccountAttempt = {
  attemptId: string;
  runId: string;
  stageNumber: number;
  scenarioVersion: string;
  startedAt: string;
  startedRevision: number;
  startOperationId: string;
  initialPowers: CanonicalPowers;
};
export type CampaignResult = {
  runId: string;
  score: number;
  finalizedAt: string;
  finalizedRevision: number;
  rulesVersion: string;
  catalogVersion: string;
  scoreVersion: 'regular-campaign-points-v1';
  regularStages: 11;
};
export type AccountCampaign = {
  runId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'RESET';
  startedAt: string;
  closedAt?: string;
  resetReason?: string;
  score: number;
  completedStages: number[];
  result: CampaignResult | null;
};
export function readCampaign(value: unknown): AccountCampaign | null {
  if (value === null) return null;
  if (
    !record(value) ||
    !validUUID(value.runId) ||
    !['ACTIVE', 'COMPLETED', 'RESET'].includes(String(value.status)) ||
    typeof value.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.startedAt)) ||
    !count(value.score) ||
    !Array.isArray(value.completedStages) ||
    value.completedStages.length > 11 ||
    !value.completedStages.every((stage, i) => stage === i + 1)
  )
    throw new RequestError('protocol');
  if (value.status !== 'ACTIVE' && (typeof value.closedAt !== 'string' || !Number.isFinite(Date.parse(value.closedAt)))) throw new RequestError('protocol');
  if (value.status === 'COMPLETED') {
    const r = value.result;
    if (
      !record(r) ||
      r.runId !== value.runId ||
      r.score !== value.score ||
      r.regularStages !== 11 ||
      value.completedStages.length !== 11 ||
      typeof r.finalizedAt !== 'string' ||
      !Number.isFinite(Date.parse(r.finalizedAt)) ||
      !count(r.finalizedRevision) ||
      r.scoreVersion !== 'regular-campaign-points-v1' ||
      r.rulesVersion !== 'account-gameplay-v1' ||
      r.catalogVersion !== 'stage-catalog-2026-09-29-v1'
    )
      throw new RequestError('protocol');
  } else if (value.result !== null) throw new RequestError('protocol');
  return value as unknown as AccountCampaign;
}
export type CurrentUser = UserProfile & {
  id: string;
  email: string;
  hearts: number;
  powers: CanonicalPowers;
  revision: number;
  rulesVersion: string;
  campaignVersion: string;
  runId: string | null;
  frontier: number;
  activeAttempt: ActiveAccountAttempt | null;
  pendingRewards: { attemptId: string; runId: string; quantity: number }[];
  legacyInterrupted: boolean;
  campaign: AccountCampaign | null;
  sandboxUnlocked: boolean;
  campaignNeedsReset: boolean;
};
export const validUUID = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function readCurrentUser(value: unknown): CurrentUser {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(value.id) ||
    typeof value.email !== 'string' ||
    !count(value.hearts) ||
    typeof value.username !== 'string' ||
    typeof value.avatar !== 'string' ||
    !['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png', 'avatar5.png', 'avatar6.png'].includes(value.avatar) ||
    !['hearts', 'totalScore', 'gamesPlayed', 'gamesWon', 'gamesLost'].every((k) => count(value[k])) ||
    !record(value.progress) ||
    !Array.isArray(value.badges) ||
    !count(value.playerExp) ||
    !count(value.playerLevel) ||
    Number(value.playerLevel) < 1
  )
    throw new RequestError('protocol');
  readPowers(value.powers);
  readCampaign(value.campaign);
  if (typeof value.sandboxUnlocked !== 'boolean' || typeof value.campaignNeedsReset !== 'boolean') throw new RequestError('protocol');
  if (
    !count(value.revision) ||
    value.rulesVersion !== 'account-gameplay-v1' ||
    value.campaignVersion !== 'stage-catalog-2026-09-29-v1' ||
    (value.runId !== null && !validUUID(value.runId)) ||
    !Number.isInteger(value.frontier) ||
    Number(value.frontier) < 1 ||
    Number(value.frontier) > 12 ||
    !Array.isArray(value.pendingRewards) ||
    typeof value.legacyInterrupted !== 'boolean'
  )
    throw new RequestError('protocol');
  for (const reward of value.pendingRewards)
    if (!record(reward) || !validUUID(reward.attemptId) || !validUUID(reward.runId) || reward.quantity !== 2) throw new RequestError('protocol');
  if (value.activeAttempt !== null) {
    const a = value.activeAttempt;
    if (
      !record(a) ||
      !validUUID(a.attemptId) ||
      !validUUID(a.runId) ||
      a.runId !== value.runId ||
      !validUUID(a.startOperationId) ||
      !count(a.startedRevision) ||
      Number(a.startedRevision) > Number(value.revision) ||
      !Number.isInteger(a.stageNumber) ||
      Number(a.stageNumber) < 1 ||
      Number(a.stageNumber) > 12 ||
      typeof a.scenarioVersion !== 'string' ||
      typeof a.startedAt !== 'string' ||
      !Number.isFinite(Date.parse(a.startedAt))
    )
      throw new RequestError('protocol');
    readPowers(a.initialPowers);
  }
  if (!Object.entries(value.progress).every(([k, v]) => /^stage([1-9]|1[0-2])$/.test(k) && record(v) && typeof v.completed === 'boolean'))
    throw new RequestError('protocol');
  return value as unknown as CurrentUser;
}
