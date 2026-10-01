import { accountSession } from './http';
import type { Powers, PowerKey, UserProfile } from '@/types';

export type GameStatus = {
  profile?: UserProfile;
  hearts?: number;
  maxHearts?: number;
  powers: Powers;
  allowedStage?: number;
  nextRefillAt?: string | Date | null;
};

export type StartStageResponse = {
  message: string;
  stage: string;
  boosters: Powers;
  activeStageRun?: unknown;
};

/**
 * Start a stage with optional selected boosters
 */
export async function apiStartStage(userId: string, stageNumber: number, stageSelectedBoosters?: Partial<Powers>) {
  return accountSession.ownerRequest<StartStageResponse>(userId, `/api/game/start/${stageNumber}`, {
    method: 'POST',
    body: JSON.stringify({ stageSelectedBoosters }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Complete a stage and get points/progression
 */
export async function apiCompleteStage(userId: string, stageNumber: number, usedPower?: PowerKey) {
  return accountSession.ownerRequest(userId, `/api/game/completeStage/${stageNumber}`, {
    method: 'POST',
    body: JSON.stringify({ usedPower }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Lose a game - resets progress, powers, score
 */
export async function apiLoseGame(userId: string) {
  return accountSession.ownerRequest(userId, `/api/game/lose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Abandon a game - resets progress, powers, score (same as lose)
 */
export async function apiAbandonGame(userId: string, usedPower?: PowerKey) {
  return accountSession.ownerRequest(userId, `/api/game/abandon`, {
    method: 'POST',
    body: JSON.stringify({ usedPower }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Get current game status (powers, progress, hearts, etc.)
 */
export async function apiGetGameStatus(userId: string, signal?: AbortSignal) {
  return accountSession.ownerRequest<GameStatus>(userId, `/api/game/status`, {
    method: 'GET',
    signal,
  });
}
