// src/types/index.ts

/**
 * User type for leaderboard, profile, etc.
 * - id: unique identifier (string)
 * - name: display name
 * - score: numeric score for leaderboard ranking
 * - avatar?: optional URL for user avatar
 */
export type User = {
  id: string;
  name: string;
  score: number;
  avatar?: string; // optional, can be undefined if not provided
};
