import type { Progress, LevelId } from '@/services/progress/ProgressStore';
import { levelTheme } from './levelTheme';
import LevelCard from './LevelCard';

type LevelGridProps = {
  progress: Progress;
  onSelect: (level: LevelId) => void;
};

const TOTAL_LEVELS = 12;

const LevelGrid = ({ progress, onSelect }: LevelGridProps) => {
  // Convert arrays to Set for faster lookup (O(1))
  const unlockedSet = new Set(progress.unlockedLevels);
  const completedSet = new Set(progress.completedLevels);

  return (
    <div className={`${levelTheme.container} ${levelTheme.grid}`}>
      {Array.from({ length: TOTAL_LEVELS }, (_, index) => {
        // Levels are 1-based (1..12)
        const level = (index + 1) as LevelId;

        /*
          Unlock rules:
          1. Level 1 is always unlocked
          2. If backend already marked this level as unlocked → unlocked
          3. If previous level is completed → unlock next level
        */
        const isUnlocked = level === 1 || unlockedSet.has(level) || completedSet.has(level - 1);

        return <LevelCard key={level} level={level} isLocked={!isUnlocked} onClick={() => onSelect(level)} />;
      })}
    </div>
  );
};

export default LevelGrid;
