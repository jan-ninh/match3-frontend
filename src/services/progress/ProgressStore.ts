export type LevelId = number;

export interface Progress {
  unlockedLevels: LevelId[];
  completedLevels: LevelId[];
  lastPlayedLevel?: LevelId;
}

export interface ProgressStore {
  get(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
  reset(): Promise<void>;
}
