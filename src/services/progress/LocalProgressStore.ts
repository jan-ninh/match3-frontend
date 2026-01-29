import type { Progress, ProgressStore } from './ProgressStore';

const STORAGE_KEY = 'match3-progress';

const defaultProgress: Progress = {
  unlockedLevels: [1],
  completedLevels: [],
};

export class LocalProgressStore implements ProgressStore {
  async get(): Promise<Progress> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;

    try {
      return JSON.parse(raw) as Progress;
    } catch {
      return defaultProgress;
    }
  }

  async save(progress: Progress): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  async reset(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}
