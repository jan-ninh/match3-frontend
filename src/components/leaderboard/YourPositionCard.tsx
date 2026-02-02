import { THEME_CONFIG } from './theme';
import type { User } from '@/types';
type YourPositionProps = {
  user: User;
  rank: number;
};

const YourPositionCard = ({ user, rank }: YourPositionProps) => (
  <div className={`flex justify-between items-center ${THEME_CONFIG.borderRadius} ${THEME_CONFIG.colors.yourPositionBg} ${THEME_CONFIG.spacing} mt-4`}>
    <span className="font-bold">{rank}</span>
    <span>{user.name} (You)</span>
    <span>{user.score}</span>
  </div>
);

export default YourPositionCard;
