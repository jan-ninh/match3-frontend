import { levelTheme } from './levelTheme';

type Props = {
  level: number;
  isLocked: boolean;
  onClick: () => void;
};

export default function LevelCard({ level, isLocked, onClick }: Props) {
  return (
    <button
      disabled={isLocked}
      onClick={onClick}
      className={`${levelTheme.button.base} ${isLocked ? levelTheme.button.locked : levelTheme.button.active} flex flex-col items-center justify-center gap-1`}
    >
      {isLocked ? (
        <img src="/icons/lock.svg" alt="Locked level" className="w-8 h-8 opacity-60" />
      ) : (
        <>
          <img src="/icons/play.svg" alt="play level" className="w-6 h-6 opacity-60" />
          <span className="text-sm">Level {level}</span>
        </>
      )}
    </button>
  );
}