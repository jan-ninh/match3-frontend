// src/api/campaign.ts
import { request } from './http';

export type CampaignId = string;

export type Outcome = 'WIN' | 'LOSS';

export type AbortReason = 'disconnect' | 'quit' | 'crash' | 'timeout' | 'unknown';

export type CampaignStartRequestBody = Readonly<{
  /**
   * Optional explicit override.
   * If omitted, the client will try to derive it from localStorage (AuthContext persist).
   */
  ACCOUNT_ID?: string;
  CLIENT_VERSION?: string;
  PLATFORM?: string;
  CLIENT_TIMESTAMP_MS?: number;
}>;

export type CampaignStartResponseBody = Readonly<{
  CAMPAIGN_ID: CampaignId;
}>;

export type CampaignLevelEndRequestBody = Readonly<{
  CAMPAIGN_ID: CampaignId;
  LEVEL_INDEX: number; // 1..12
  ATTEMPT_ID: string; // uuid (FE-generated)
  OUTCOME: Outcome;
  MOVES_USED_RAW: number;

  CLIENT_TIMESTAMP_MS?: number;
  CLIENT_VERSION?: string;
  LEVEL_CONFIG_HASH?: string;
  PLATFORM?: string;
}>;

export type CampaignLevelAbortRequestBody = Readonly<{
  CAMPAIGN_ID: CampaignId;
  LEVEL_INDEX: number; // 1..12
  ATTEMPT_ID: string; // uuid (FE-generated)
  ABORT_REASON: AbortReason;

  MOVES_USED_AT_ABORT?: number;
  CLIENT_TIMESTAMP_MS?: number;
  CLIENT_VERSION?: string;
  PLATFORM?: string;
}>;

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

function readStoredAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'id' in parsed) {
      const v = (parsed as { id?: unknown }).id;
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Start a campaign/run. Backend returns CAMPAIGN_ID.
 */
export async function apiStartCampaign(body: CampaignStartRequestBody = {}): Promise<CampaignStartResponseBody> {
  const accountId = (body.ACCOUNT_ID ?? readStoredAccountId()) ?? undefined;

  const payload: CampaignStartRequestBody = accountId ? { ...body, ACCOUNT_ID: accountId } : body;

  return request('/api/campaign/start', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}

/**
 * Finalize a level attempt (WIN/LOSS) with FE-observed moves used.
 */
export async function apiCampaignLevelEnd(body: CampaignLevelEndRequestBody): Promise<void> {
  await request('/api/campaign/levelEnd', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

/**
 * Optional: explicit abort (disconnect/quit/crash/timeout/unknown).
 */
export async function apiCampaignLevelAbort(body: CampaignLevelAbortRequestBody): Promise<void> {
  await request('/api/campaign/levelAbort', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}
