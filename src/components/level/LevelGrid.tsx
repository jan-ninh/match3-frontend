import LevelCard from './LevelCard';
import { levelTheme } from './levelTheme';
import type { Progress, LevelId } from '@/services/progress/ProgressStore';

type Props = {
  progress: Progress;
  onSelect: (level: LevelId) => void;
};

const TOTAL_LEVELS = 12;

export default function LevelGrid({ progress, onSelect }: Props) {
  const completedSet = new Set(progress.completedLevels);
  const highestCompleted = progress.completedLevels.length ? Math.max(...progress.completedLevels) : 0;
  const currentStage = Math.min(TOTAL_LEVELS, Math.max(1, highestCompleted + 1));

  return (
    <div className={`${levelTheme.container} ${levelTheme.grid}`}>
      {Array.from({ length: TOTAL_LEVELS }, (_, index) => {
        const level = (index + 1) as LevelId;
        const isCompleted = completedSet.has(level);
        const isCurrentStage = level === currentStage;
        const isFutureLocked = level > currentStage;

        return (
          <LevelCard
            key={level}
            level={level}
            isCompleted={isCompleted && !isCurrentStage}
            isFutureLocked={isFutureLocked}
            isSelectable={isCurrentStage}
            onClick={() => {
              if (isCurrentStage) onSelect(level);
            }}
          />
        );
      })}
    </div>
  );
}
