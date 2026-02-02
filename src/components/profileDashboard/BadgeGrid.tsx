import { DASHBOARD_STYLE as S } from './theme';

type Badge = {
  id: string;
  label: string;
  icon: string;
  unlocked: boolean;
};

type Props = { badges: Badge[] };

const BadgeGrid = ({ badges }: Props) => (
  <div className={`grid grid-cols-3 gap-3 justify-items-center rounded-2xl p-4 bg-white/50 backdrop-blur-md ${S.glass.full}`}>
    {badges.map((badge) => (
      <div
        key={badge.id}
        className={`flex items-center  w-20 h-20 ${S.glass.bg} ${S.glass.blur} ${S.glass.border} ${S.glass.radius} ${S.glass.padding} ${S.badge.size} ${badge.unlocked ? S.badge.unlocked : S.badge.locked}`}
      >
        <img src={badge.icon} alt={badge.label} className="object-contain" draggable={false} />
      </div>
    ))}
  </div>
);

export default BadgeGrid;
