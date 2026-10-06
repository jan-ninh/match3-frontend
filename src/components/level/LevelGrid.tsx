import LevelCard from './LevelCard';
import { levelTheme } from './levelTheme';
import type { Progress, LevelId } from '@/services/progress/ProgressStore';

type Props = {
  progress: Progress;
  onSelect: (level: LevelId) => void;
  playableStages?: number[];
};

const TOTAL_LEVELS = 12;

export default function LevelGrid({ progress, onSelect, playableStages }: Props) {
  const completedSet = new Set(progress.completedLevels);
  const highestCompleted = progress.completedLevels.length ? Math.max(...progress.completedLevels) : 0;
  const inferredCurrentStage = Math.min(TOTAL_LEVELS, Math.max(1, highestCompleted + 1));
  const currentStage = playableStages?.[0] ?? inferredCurrentStage;

  return (
    <div className={levelTheme.container}>
      <div className={levelTheme.grid}>
        {Array.from({ length: TOTAL_LEVELS }, (_, index) => {
          const level = (index + 1) as LevelId;
          const isCompleted = completedSet.has(level);
          const isCurrentStage = playableStages ? playableStages.includes(level) : level === currentStage;
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
    </div>
  );
}
