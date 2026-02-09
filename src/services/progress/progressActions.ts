import { progressStore } from '@/services/progressService';
import type { LevelId, Progress } from './ProgressStore';

const MAX_LEVEL = 12;

function uniqSorted(levels: LevelId[]): LevelId[] {
  return Array.from(new Set(levels)).sort((a, b) => a - b);
}

function clampLevel(level: LevelId): LevelId {
  const n = Math.trunc(level);
  const clamped = Math.min(MAX_LEVEL, Math.max(1, n));
  return clamped as LevelId;
}

export async function getProgress(): Promise<Progress> {
  return progressStore.get();
}

export async function unlockLevel(level: LevelId): Promise<Progress> {
  const p = await progressStore.get();

  const safe = clampLevel(level);

  const next: Progress = {
    ...p,
    unlockedLevels: uniqSorted([...p.unlockedLevels, safe]),
  };

  await progressStore.save(next);
  return next;
}

export async function completeLevel(level: LevelId): Promise<Progress> {
  const p = await progressStore.get();

  const safe = clampLevel(level);

  const nextUnlocked = safe < MAX_LEVEL ? uniqSorted([...p.unlockedLevels, (safe + 1) as LevelId]) : uniqSorted([...p.unlockedLevels]);

  const nextCompleted = uniqSorted([...p.completedLevels, safe]);

  const next: Progress = {
    ...p,
    unlockedLevels: nextUnlocked,
    completedLevels: nextCompleted,
    lastPlayedLevel: safe,
  };

  await progressStore.save(next);
  return next;
}

export async function resetProgress(): Promise<void> {
  await progressStore.reset();
}
