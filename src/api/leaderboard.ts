import { request, accountRequest } from './http';
import { readTop, readOwnRank } from './leaderboardShape';
export async function apiLeaderboardTop10(signal?: AbortSignal) {
  return readTop(await request('/api/leaderboard/top', { signal }));
}
export async function apiLeaderboardOwnRank(signal?: AbortSignal) {
  return readOwnRank(await accountRequest('/api/leaderboard/me', { signal }));
}
