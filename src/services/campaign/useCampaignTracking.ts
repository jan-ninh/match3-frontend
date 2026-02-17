// src/services/campaign/useCampaignTracking.ts
import { useEffect, useRef } from 'react';

import type { EngineEvent, EngineState } from '@/gamelogic/types';
import {
  apiCampaignLevelAbort,
  apiCampaignLevelEnd,
  apiStartCampaign,
  type AbortReason,
  type CampaignId,
  type Outcome,
} from '@/api/campaign';

type SeenRing = {
  set: Set<string>;
  order: string[];
};

function markSeen(seen: SeenRing, id: string, max: number): boolean {
  if (seen.set.has(id)) return false;
  seen.set.add(id);
  seen.order.push(id);

  while (seen.order.length > max) {
    const oldest = seen.order.shift();
    if (oldest) seen.set.delete(oldest);
  }

  return true;
}

type HardBoundaryEvent = Extract<EngineEvent, { type: 'hardBoundary' }>;

function isHardBoundaryEvent(ev: EngineEvent): ev is HardBoundaryEvent {
  return ev.type === 'hardBoundary';
}

function nowMsUnix(): number {
  // Intentionally wall-clock (debug only). Backend should use server time.
  return Date.now();
}

function getPlatform(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return 'web';
}

function getClientVersion(): string | undefined {
  // Vite env keys are project-defined; avoid depending on a specific declaration file.
  const env = import.meta.env as unknown as Record<string, string | boolean | undefined>;
  const v = env.VITE_CLIENT_VERSION;
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();

  const commit = env.VITE_GIT_COMMIT;
  if (typeof commit === 'string' && commit.trim().length > 0) return commit.trim();

  return undefined;
}

function levelConfigHashFor(levelIndex: number): string {
  // Minimal stable hash until FE/BE share a real config hash.
  return `level:${levelIndex}`;
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  // Fallback: RFC4122-ish v4
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // last resort (should be rare)
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // eslint wants clarity; avoid bit twiddling in one line.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type AttemptCtx = {
  levelIndex: number;
  attemptId: string;
};

type Args = {
  state: Pick<EngineState, 'levelId' | 'movesTotal' | 'movesLeft' | 'phase' | 'events'>;
};

export function useCampaignTracking({ state }: Args): void {
  const campaignIdRef = useRef<CampaignId | null>(null);
  const startInFlightRef = useRef<Promise<CampaignId | null> | null>(null);

  const attemptRef = useRef<AttemptCtx | null>(null);
  const reportedAttemptsRef = useRef<Set<string>>(new Set());

  const seenInitBoundaryRef = useRef<SeenRing>({ set: new Set<string>(), order: [] });

  const pendingSendsRef = useRef<Array<() => Promise<void>>>([]);

  const metaRef = useRef<{
    PLATFORM?: string;
    CLIENT_VERSION?: string;
  }>({
    PLATFORM: getPlatform(),
    CLIENT_VERSION: getClientVersion(),
  });

  const flushPending = async () => {
    const cid = campaignIdRef.current;
    if (!cid) return;

    const q = pendingSendsRef.current.splice(0);
    for (const send of q) {
      try {
        await send();
      } catch (err) {
        // best-effort; keep queue cleared to avoid infinite loops
        console.warn('[campaign] flush send failed', err);
      }
    }
  };

  const ensureCampaign = async (): Promise<CampaignId | null> => {
    const existing = campaignIdRef.current;
    if (existing) return existing;

    const inflight = startInFlightRef.current;
    if (inflight) return inflight;

    const p = (async (): Promise<CampaignId | null> => {
      try {
        const res = await apiStartCampaign({
          PLATFORM: metaRef.current.PLATFORM,
          CLIENT_VERSION: metaRef.current.CLIENT_VERSION,
          CLIENT_TIMESTAMP_MS: nowMsUnix(),
        });

        campaignIdRef.current = res.CAMPAIGN_ID;
        startInFlightRef.current = null;

        await flushPending();
        return res.CAMPAIGN_ID;
      } catch (err) {
        startInFlightRef.current = null;
        console.warn('[campaign] start failed', err);
        return null;
      }
    })();

    startInFlightRef.current = p;
    return p;
  };

  const ensureAttempt = (): AttemptCtx => {
    const a = attemptRef.current;
    if (a) return a;

    const created: AttemptCtx = { levelIndex: state.levelId, attemptId: createUuid() };
    attemptRef.current = created;

    // fire-and-forget: campaign start at latest by first attempt
    void ensureCampaign();

    return created;
  };

  const reportLevelEnd = async (outcome: Outcome) => {
    const a = ensureAttempt();
    if (reportedAttemptsRef.current.has(a.attemptId)) return;

    reportedAttemptsRef.current.add(a.attemptId);

    const movesUsedRaw = Math.max(0, (state.movesTotal | 0) - (state.movesLeft | 0));

    const payloadBase = {
      LEVEL_INDEX: a.levelIndex,
      ATTEMPT_ID: a.attemptId,
      OUTCOME: outcome,
      MOVES_USED_RAW: movesUsedRaw,
      CLIENT_TIMESTAMP_MS: nowMsUnix(),
      CLIENT_VERSION: metaRef.current.CLIENT_VERSION,
      LEVEL_CONFIG_HASH: levelConfigHashFor(a.levelIndex),
      PLATFORM: metaRef.current.PLATFORM,
    } as const;

    const send = async () => {
      const cid = campaignIdRef.current;
      if (!cid) return;
      await apiCampaignLevelEnd({ ...payloadBase, CAMPAIGN_ID: cid });
    };

    const cid = await ensureCampaign();
    if (cid) {
      await send();
      return;
    }

    // start failed → queue best-effort
    pendingSendsRef.current.push(send);
  };

  const reportAbort = async (reason: AbortReason) => {
    const a = attemptRef.current;
    if (!a) return;
    if (reportedAttemptsRef.current.has(a.attemptId)) return;

    // Don't "report" attempt as ended; abort is a separate signal.
    const movesUsedAtAbort = Math.max(0, (state.movesTotal | 0) - (state.movesLeft | 0));

    const payloadBase = {
      LEVEL_INDEX: a.levelIndex,
      ATTEMPT_ID: a.attemptId,
      ABORT_REASON: reason,
      MOVES_USED_AT_ABORT: movesUsedAtAbort,
      CLIENT_TIMESTAMP_MS: nowMsUnix(),
      CLIENT_VERSION: metaRef.current.CLIENT_VERSION,
      PLATFORM: metaRef.current.PLATFORM,
    } as const;

    const send = async () => {
      const cid = campaignIdRef.current;
      if (!cid) return;
      await apiCampaignLevelAbort({ ...payloadBase, CAMPAIGN_ID: cid });
    };

    const cid = await ensureCampaign();
    if (cid) {
      await send();
      return;
    }

    pendingSendsRef.current.push(send);
  };

  // 1) Detect initLevel boundaries → new attemptId
  useEffect(() => {
    const seen = seenInitBoundaryRef.current;

    for (const ev of state.events) {
      if (!isHardBoundaryEvent(ev)) continue;
      if (ev.kind !== 'initLevel') continue;

      const id = `${ev.kind}:${ev.animTokenBase}:${ev.nowMs}`;
      if (!markSeen(seen, id, 32)) continue;

      attemptRef.current = { levelIndex: state.levelId, attemptId: createUuid() };
      void ensureCampaign();
    }

    // If engine didn't emit hardBoundary for initial render, bootstrap once.
    if (!attemptRef.current) {
      attemptRef.current = { levelIndex: state.levelId, attemptId: createUuid() };
      void ensureCampaign();
    }
  }, [state.events, state.levelId]);

  // 2) Detect terminal phases → levelEnd once (WIN/LOSS)
  const prevPhaseRef = useRef<EngineState['phase'] | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;

    const phase = state.phase;
    if (phase !== 'win' && phase !== 'lose') return;

    // avoid double-fire if already terminal in previous render
    if (prev === phase) return;

    const outcome: Outcome = phase === 'win' ? 'WIN' : 'LOSS';
    void reportLevelEnd(outcome);
  }, [state.phase, state.movesLeft, state.movesTotal]);

  // 3) Best-effort abort reporting on tab/page hide
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPageHide = () => {
      void reportAbort('disconnect');
    };

    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  // 4) Best-effort abort reporting on unmount / route leave
  useEffect(() => {
    return () => {
      void reportAbort('quit');
    };
  }, []);
}
