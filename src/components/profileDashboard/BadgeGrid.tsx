import { DASHBOARD_STYLE as S } from './theme';

type Badge = {
  id: string;
  label: string;
  icon: string;
  unlocked?: boolean;
};

type Props = { badges: Badge[] };

export default function BadgeGrid({ badges }: Props) {
  return (
    <div className={`grid grid-cols-3 gap-3 justify-items-center rounded-2xl p-4 bg-white/50 backdrop-blur-md ${S.glass.full}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`group relative flex items-center ${S.glass.bg} ${S.glass.blur} ${S.glass.border} ${S.glass.radius} ${S.glass.padding} ${S.badge.size} ${
            badge.unlocked ? S.badge.unlocked : S.badge.locked
          } cursor-help`}
        >
          <img src={badge.icon} alt={badge.label} className="object-contain" draggable={false} />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {badge.label}
          </div>
        </div>
      ))}
    </div>
  );
}
