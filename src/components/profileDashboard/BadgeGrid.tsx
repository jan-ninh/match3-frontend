import { DASHBOARD_STYLE as S } from '@/components';

type Badge = {
  id: string;
  label: string;
  icon: string;
  unlocked?: boolean;
};

type Props = { badges: Badge[] };

export default function BadgeGrid({ badges }: Props) {
  return (
    <div className={`grid grid-cols-3 gap-3 justify-items-center ${S.glass.full}`}>
      {badges.map((badge) => {
        const unlocked = !!badge.unlocked;

        return (
          <div
            key={badge.id}
            className={[
              'group relative flex items-center justify-center',

              'overflow-visible',
              'rounded-2xl p-3',
              S.badge.size,
              'cursor-help',
              'transition duration-300',
              unlocked ? 'opacity-100' : 'opacity-25 grayscale',
            ].join(' ')}
          >
            {/* Card body */}
            <div
              className={[
                'absolute inset-0 rounded-2xl',
                'backdrop-blur-sm',
                // unlocked
                unlocked ? 'bg-purple-200/30' : 'bg-cyan-950/25',
                // Orange and purple neon borders for unlocked
                unlocked
                  ? 'border border-white/10 ring-1 ring-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.22),0_0_30px_rgba(251,146,60,0.14)]'
                  : 'border border-white/10',
              ].join(' ')}
            />

            {/* Neon blobs inside */}
            <div
              className={[
                'pointer-events-none absolute inset-0 rounded-2xl',
                unlocked ? 'opacity-55' : 'opacity-25',
                'bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.22),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(251,146,60,0.18),transparent_60%)]',
              ].join(' ')}
            />

            {/* Subtle sheen for unlocked */}
            {unlocked ? (
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-35 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.10)_35%,transparent_70%)]" />
            ) : null}

            {/* Icon */}
            <img
              src={badge.icon}
              alt={badge.label}
              draggable={false}
              className={[
                'relative object-contain select-none',
                unlocked ? 'brightness-110 contrast-110 drop-shadow-[0_0_16px_rgba(168,85,247,0.22)]' : '',
              ].join(' ')}
            />

            {/* Tooltip  */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md border border-purple-400/25 text-white/90 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-[0_0_16px_rgba(168,85,247,0.18),0_0_22px_rgba(251,146,60,0.10)]">
              {badge.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
