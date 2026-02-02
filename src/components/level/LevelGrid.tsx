import LevelCard from './LevelCard';
import { levelTheme } from './levelTheme';
import type { Progress, LevelId } from '@/services/progress/ProgressStore';

type Props = {
  progress: Progress;
  onSelect: (level: LevelId) => void;
};

const TOTAL_LEVELS = 12;

export default function LevelGrid({ progress, onSelect }: Props) {
  const unlockedSet = new Set(progress.unlockedLevels);
  const completedSet = new Set(progress.completedLevels);

  return (
    <div className={`${levelTheme.container} ${levelTheme.grid}`}>
      {Array.from({ length: TOTAL_LEVELS }, (_, index) => {
        const level = (index + 1) as LevelId;
        const isUnlocked = level === 1 || unlockedSet.has(level) || completedSet.has(level - 1);

        return (
          <LevelCard
            key={level}
            level={level}
            isLocked={!isUnlocked}
            onClick={() => {
              if (isUnlocked) onSelect(level);
            }}
          />
        );
      })}
    </div>
  );
}