import { request } from './http';
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
  return request<StartStageResponse>(`/api/game/start/${userId}/${stageNumber}`, {
    method: 'POST',
    body: JSON.stringify({ stageSelectedBoosters }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Complete a stage and get points/progression
 */
export async function apiCompleteStage(userId: string, stageNumber: number, usedPower?: PowerKey) {
  return request(`/api/game/completeStage/${userId}/${stageNumber}`, {
    method: 'POST',
    body: JSON.stringify({ usedPower }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Lose a game - resets progress, powers, score
 */
export async function apiLoseGame(userId: string) {
  return request(`/api/game/lose/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Abandon a game - resets progress, powers, score (same as lose)
 */
export async function apiAbandonGame(userId: string, usedPower?: PowerKey) {
  return request(`/api/game/abandon/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ usedPower }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Get current game status (powers, progress, hearts, etc.)
 */
export async function apiGetGameStatus(userId: string) {
  return request<GameStatus>(`/api/game/${userId}/status`, {
    method: 'GET',
  });
}
