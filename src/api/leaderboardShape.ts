import { RequestError } from './transport.ts';
export const SCORE_VERSION = 'regular-campaign-points-v1';
export type RankedPlayer = { id: string; name: string; avatar: string; score: number; rank: number; finalizedAt: string };
export type OwnRank = { rank: number | null; best: RankedPlayer | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function row(v: unknown): RankedPlayer {
  if (
    !record(v) ||
    typeof v.accountId !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(v.accountId) ||
    typeof v.username !== 'string' ||
    typeof v.avatar !== 'string' ||
    !Number.isSafeInteger(v.score) ||
    Number(v.score) < 0 ||
    !Number.isSafeInteger(v.rank) ||
    Number(v.rank) < 1 ||
    typeof v.finalizedAt !== 'string' ||
    !Number.isFinite(Date.parse(v.finalizedAt)) ||
    v.scoreVersion !== SCORE_VERSION
  )
    throw new RequestError('protocol');
  return { id: v.accountId, name: v.username, avatar: v.avatar, score: Number(v.score), rank: Number(v.rank), finalizedAt: v.finalizedAt };
}
export function readTop(v: unknown): RankedPlayer[] {
  if (!record(v) || v.scoreVersion !== SCORE_VERSION || !Array.isArray(v.entries) || v.entries.length > 10) throw new RequestError('protocol');
  const rows = v.entries.map(row);
  if (rows.some((r, i) => r.rank !== i + 1) || new Set(rows.map((r) => r.id)).size !== rows.length) throw new RequestError('protocol');
  return rows;
}
export function readOwnRank(v: unknown): OwnRank {
  if (!record(v) || v.scoreVersion !== SCORE_VERSION) throw new RequestError('protocol');
  if (v.rank === null && v.best === null) return { rank: null, best: null };
  const best = row(v.best);
  if (v.rank !== best.rank) throw new RequestError('protocol');
  return { rank: best.rank, best };
}
export const leaderboardPresentation = (status: 'loading' | 'success' | 'error', rows: RankedPlayer[] | undefined) =>
  status === 'loading' ? 'loading' : status === 'error' ? 'unavailable' : rows?.length ? 'ready' : 'empty';
