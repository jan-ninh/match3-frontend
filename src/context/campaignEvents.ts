// src/context/campaignEvents.ts
export const CAMPAIGN_DEBUG_EVENT = 'match3:campaignDebug' as const;

export type CampaignDebugLastSend =
  | Readonly<{
      kind: 'campaignStart';
      ok: boolean;
      atMs: number;
      message?: string;
    }>
  | Readonly<{
      kind: 'levelEnd';
      ok: boolean;
      atMs: number;
      message?: string;
    }>
  | Readonly<{
      kind: 'levelAbort';
      ok: boolean;
      atMs: number;
      message?: string;
    }>;

export type CampaignDebugDetail = Readonly<{
  campaignId: string | null;
  levelIndex: number | null;
  attemptId: string | null;

  phase: string | null;

  movesTotal: number | null;
  movesLeft: number | null;
  movesUsedRaw: number | null;

  sentLevelEnd: boolean;
  sentLevelAbort: boolean;

  queuedSends: number;

  lastSend: CampaignDebugLastSend | null;
}>;
