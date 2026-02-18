import { request } from './http';
import type { User } from '@/types';

type LeaderboardEntryDTO = {
  _id?: string;
  userId?: string;
  username: string;
  totalScore: number;
  avatar?: string;
};
type Top10Response = {
  top10: LeaderboardEntryDTO[];
};

export async function apiLeaderboardTop10(): Promise<User[]> {
  const data = await request<Top10Response>('/api/leaderboard/top10', { method: 'GET' });
  const list = Array.isArray(data.top10) ? data.top10 : [];

  return list.map((entry) => ({
    id: String(entry.userId ?? entry._id ?? entry.username),
    name: entry.username,
    score: entry.totalScore,
    avatar: entry.avatar || 'default.png',
  }));
}
