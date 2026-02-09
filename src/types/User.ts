export type User = {
  id: string;
  name: string;
  score: number;
  avatar?: string;
};

// types/user.ts
export type PowerKey = 'bomb' | 'rocket' | 'extraTime';

export type Powers = {
  bomb: number;
  rocket: number;
  extraTime: number;
};

export type StageProgress = {
  completed: boolean;
  points: number;
  lastCompletedAt?: string | null;
  usedPower?: PowerKey;
};

export type BadgeProgress = {
  badgeKey: string;
  achievedAt: string;
};

export type UserProfile = {
  username: string;
  avatar: 'default.svg' | 'avatar1.svg' | 'avatar2.svg' | 'avatar3.svg';
  powers: Powers;
  totalScore: number;
  progress: Record<string, StageProgress>; // e.g. { "stage1": {...}, "stage2": {...} }
  badges: BadgeProgress[];
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
};
