import { levelTheme as T } from './levelTheme';
import { useAudio } from '@/context/AudioContext';

type Props = {
  level: number;
  isCompleted: boolean;
  isFutureLocked: boolean;
  isSelectable: boolean;
  onClick: () => void;
};

export default function LevelCard({ level, isCompleted, isFutureLocked, isSelectable, onClick }: Props) {
  const { playClickSound } = useAudio();

  const stroke = isFutureLocked ? '#ec4899' : isSelectable ? '#22d3ee' : '#34d399';
  const strokeOpacity = isFutureLocked ? 0.42 : isSelectable ? 1 : 0.72;
  const numberClass = isFutureLocked ? 'text-pink-100/60' : isSelectable ? 'text-cyan-50' : 'text-emerald-100/75';
  const iconClass = isFutureLocked
    ? 'opacity-60'
    : isSelectable
      ? 'opacity-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.65)]'
      : 'opacity-75';

  const handleClick = () => {
    if (!isSelectable) return;
    playClickSound();
    onClick();
  };

  return (
    <button
      type="button"
      aria-label={level === 12 ? 'Sandbox 12' : `Stage ${level}`}
      disabled={!isSelectable}
      onClick={handleClick}
      className={`${T.button.base} ${isSelectable ? T.button.active : isCompleted ? T.button.completed : T.button.locked}`}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="25,6 75,6 96,50 75,94 25,94 4,50"
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={isSelectable ? 2.2 : isFutureLocked ? 1.2 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(2,6,23,0.86)"
        />
      </svg>

      <span aria-hidden="true" className={`${T.shape.clip} pointer-events-none absolute inset-[3px] bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.72))]`} />
      <span aria-hidden="true" className={`${T.shape.clip} pointer-events-none absolute inset-[3px] opacity-35 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.12),transparent_48%)]`} />

      {isSelectable && (
        <span
          aria-hidden="true"
          className={`${T.shape.clip} pointer-events-none absolute inset-0 opacity-45 transition-opacity duration-150 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.32),transparent_64%)] group-hover:opacity-85`}
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center gap-1">
        <span className={`text-3xl font-black leading-none tabular-nums sm:text-[34px] ${numberClass}`}>
          {String(level).padStart(2, '0')}
        </span>

        <span aria-hidden="true" className="mt-1 flex h-4 items-center justify-center">
          {isFutureLocked ? (
            <img src="/icons/lock.svg" alt="" className={`h-4 w-4 ${iconClass}`} />
          ) : isCompleted ? (
            <span className={`text-lg leading-none text-emerald-300 ${iconClass}`}>✓</span>
          ) : (
            <img src="/icons/play.svg" alt="" className={`h-4 w-4 ${iconClass}`} />
          )}
        </span>
      </div>
    </button>
  );
}
