// src/features/devtools-host/lib/backend/httpError.ts

export function getHttpStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const rec = err as Record<string, unknown>;
  const s = rec.status;
  if (typeof s === 'number' && Number.isFinite(s)) return s | 0;
  return null;
}

export function getHttpMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== 'object') return String(err);
  const rec = err as Record<string, unknown>;
  const m = rec.message;
  if (typeof m === 'string') return m;
  return String(err);
}

export function isPrevStageNotCompleted(err: unknown): boolean {
  const msg = getHttpMessage(err);
  return /previous\s+stage\s+not\s+completed/i.test(msg);
}

export function extractAllowedStage(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;

  const maybePayload = (err as { payload?: unknown }).payload;
  if (!maybePayload || typeof maybePayload !== 'object') return null;

  const raw = (maybePayload as { allowedStage?: unknown }).allowedStage;
  if (typeof raw !== 'number') return null;
  if (!Number.isFinite(raw) || raw < 1) return null;

  return Math.floor(raw);
}
