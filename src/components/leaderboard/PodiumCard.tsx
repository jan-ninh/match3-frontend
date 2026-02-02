import Avatar from '../Avatar';
import { THEME_CONFIG } from './theme';
import type { User } from '@/types';
type PodiumCardProps = {
  user: User;
  position: number;
};
const PodiumCard = ({ user, position }: PodiumCardProps) => {
  const height = position === 1 ? 'h-48' : position === 2 ? 'h-36' : 'h-32';
  const bgColor = position === 1 ? THEME_CONFIG.colors.podium.first : position === 2 ? THEME_CONFIG.colors.podium.second : THEME_CONFIG.colors.podium.third;

  return (
    <div className={`flex flex-col items-center ${THEME_CONFIG.borderRadius} w-24 ${height} ${bgColor} mx-2`}>
      <div
        className={`w-full h-12 ${THEME_CONFIG.colors.podium.headerText} flex items-center justify-center font-bold`}
        style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
      >
        {position}
      </div>
      <div className="flex-1 flex flex-col justify-end items-center p-2">
        <Avatar size={48} />
        <span className="font-semibold">{user.name}</span>
        <span className="text-sm">{user.score} pts</span>
      </div>
    </div>
  );
};
export default PodiumCard;
