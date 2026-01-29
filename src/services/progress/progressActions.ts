import { progressStore } from '@/services/progressService';
import type { LevelId, Progress } from './ProgressStore';

function uniqSorted(levels: LevelId[]): LevelId[] {
  return Array.from(new Set(levels)).sort((a, b) => a - b);
}

export async function getProgress(): Promise<Progress> {
  return progressStore.get();
}

export async function unlockLevel(level: LevelId): Promise<Progress> {
  const p = await progressStore.get();

  const next: Progress = {
    ...p,
    unlockedLevels: uniqSorted([...p.unlockedLevels, level]),
  };

  await progressStore.save(next);
  return next;
}

export async function completeLevel(level: LevelId): Promise<Progress> {
  const p = await progressStore.get();

  const nextUnlocked = uniqSorted([...p.unlockedLevels, level + 1]);
  const nextCompleted = uniqSorted([...p.completedLevels, level]);

  const next: Progress = {
    ...p,
    unlockedLevels: nextUnlocked,
    completedLevels: nextCompleted,
    lastPlayedLevel: level,
  };

  await progressStore.save(next);
  return next;
}

export async function resetProgress(): Promise<void> {
  await progressStore.reset();
}
