// src/types/User.ts
export type PowerKey = 'gridlaser' | 'laser' | 'extraShuffle' | 'bomb';

export type Powers = {
  /**
   * Canonical keys:
   * - gridlaser: old bomb refactor (clears 3x3)
   * - laser: row clear
   * - extraShuffle: reshuffle
   */
  gridlaser?: number;
  laser?: number;
  extraShuffle?: number;

  /**
   * Deprecated legacy alias for gridlaser.
   * Keep temporarily to survive partial refactors / old API payloads.
   */
  bomb?: number;
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
  avatar:
    | 'default.png'
    | 'avatar1.png'
    | 'avatar2.png'
    | 'avatar3.png'
    | 'avatar4.png'
    | 'avatar5.png'
    | 'avatar6.png';
  powers: Powers;
  totalScore: number;
  progress: Record<string, StageProgress>; // e.g. { "stage1": {...}, "stage2": {...} }
  badges: BadgeProgress[];
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
};

export type User = {
  id: string;
  name: string;
  score: number;
  avatar?: string;
};
