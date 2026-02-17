import { motion } from 'framer-motion';
import { levelTheme as T } from './levelTheme';

type Props = {
  level: number;
  isLocked: boolean;
  onClick: () => void;
};

export default function LevelCard({ level, isLocked, onClick }: Props) {
  const MotionButton = motion.button;

  const tintBase = isLocked ? 'bg-pink-400/10' : 'bg-cyan-300/10';
  const tintHover = isLocked ? 'group-hover:bg-pink-400/18' : 'group-hover:bg-cyan-300/18';

  const ringBase = isLocked ? 'ring-pink-300/25' : 'ring-cyan-200/25';
  const ringHover = isLocked ? 'group-hover:ring-pink-300/40' : 'group-hover:ring-cyan-200/45';

  const handleClick = () => {
    onClick();
  };

  return (
    <MotionButton
      type="button"
      disabled={isLocked}
      onClick={handleClick}
      className={`${T.button.base} ${T.shape.clip} ${isLocked ? T.button.locked : T.button.active}`}
      whileHover={isLocked ? undefined : { scale: 1.04, y: -2 }}
      whileTap={isLocked ? undefined : { scale: 0.99, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    >
      {/* octagon red border as SVG */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="25,6 75,6 96,50 75,94 25,94 4,50"
          stroke={isLocked ? '#ec4899' : '#0092B8'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* subtle ring (not a border) */}
      <span
        aria-hidden="true"
        className={`
          pointer-events-none absolute inset-0 ${T.shape.clip}
          ring-1 ${ringBase} ${ringHover}
        `}
      />

      {/* ✅ single tint layer (cyan for active, pink for locked) */}
      <span
        aria-hidden="true"
        className={`
          pointer-events-none absolute inset-0 ${T.shape.clip}
          ${tintBase} ${tintHover}
          transition-colors duration-200
        `}
      />

      {/* optional: tiny top gloss to make gradient feel “alive” */}
      <span
        aria-hidden="true"
        className={`
          pointer-events-none absolute inset-0 ${T.shape.clip}
          opacity-30
          bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),transparent_55%)]
        `}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-1">
        {isLocked ? (
          <img src="/icons/lock.svg" alt="Locked level" className="w-8 h-8 opacity-80" />
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
