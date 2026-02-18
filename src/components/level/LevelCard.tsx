import { motion } from 'framer-motion';
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
  const MotionButton = motion.button;

  const tintBase = isFutureLocked ? 'bg-pink-400/10' : isSelectable ? 'bg-cyan-300/10' : 'bg-emerald-300/10';
  const tintHover = isFutureLocked ? 'group-hover:bg-pink-400/18' : isSelectable ? 'group-hover:bg-cyan-300/18' : 'group-hover:bg-emerald-300/18';

  const ringBase = isFutureLocked ? 'ring-pink-300/25' : isSelectable ? 'ring-cyan-200/25' : 'ring-emerald-200/25';
  const ringHover = isFutureLocked ? 'group-hover:ring-pink-300/40' : isSelectable ? 'group-hover:ring-cyan-200/45' : 'group-hover:ring-emerald-200/45';

  const handleClick = () => {
    if (!isSelectable) return;
    playClickSound();
    onClick();
  };

  return (
    <MotionButton
      type="button"
      disabled={!isSelectable}
      onClick={handleClick}
      className={`${T.button.base} ${T.shape.clip} ${isSelectable ? T.button.active : T.button.locked}`}
      whileHover={!isSelectable ? undefined : { scale: 1.04, y: -2 }}
      whileTap={!isSelectable ? undefined : { scale: 0.99, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    >
      <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="25,6 75,6 96,50 75,94 25,94 4,50"
          stroke={isFutureLocked ? '#ec4899' : isSelectable ? '#0092B8' : '#10b981'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${T.shape.clip} ring-1 ${ringBase} ${ringHover}`} />

      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${T.shape.clip} ${tintBase} ${tintHover} transition-colors duration-200`} />

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${T.shape.clip} opacity-30 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),transparent_55%)]`}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-1">
        {isFutureLocked ? (
          <img src="/icons/lock.svg" alt="Locked level" className="w-8 h-8 opacity-80" />
        ) : isCompleted ? (
          <>
            <span className="text-3xl leading-none text-emerald-300">✓</span>
            <span className="text-sm text-current">Level {level}</span>
          </>
        ) : (
          <>
            <img src="/icons/play.svg" alt="Play level" className="w-6 h-6 opacity-90" />
            <span className="text-sm text-current">Level {level}</span>
          </>
        )}
      </div>
    </MotionButton>
  );
}
