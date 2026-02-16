export type User = {
  id: string;
  name: string;
  score: number;
  avatar?: string;
};

// types/user.ts
export type PowerKey = 'bomb' | 'laser' | 'extraShuffle';

export type Powers = {
  bomb: number;
  laser: number;
  extraShuffle: number;
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
  avatar: 'default.png' | 'avatar1.png' | 'avatar2.png' | 'avatar3.png' | 'avatar4.png' | 'avatar5.png' | 'avatar6.png';
  powers: Powers;
  totalScore: number;
  progress: Record<string, StageProgress>; // e.g. { "stage1": {...}, "stage2": {...} }
  badges: BadgeProgress[];
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
};
