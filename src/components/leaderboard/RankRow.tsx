import { THEME_CONFIG } from './theme';
import type { User } from '@/types';
import { Avatar } from '@/components';

type RankRowProps = {
  user: User;
  rank: number;
};

/**
 
 * - Currently uses default avatar
 *
 * Future Backend Integration:
 * - Backend should provide a field like `avatar: string` in User type
 * - Replace `<Avatar />` usage with: <Avatar src={user.avatar} size={32} />
 */
const RankRow = ({ user, rank }: RankRowProps) => (
  <div className={`flex justify-between items-center ${THEME_CONFIG.borderRadius} ${THEME_CONFIG.colors.rankRowBg} ${THEME_CONFIG.spacing} mb-2`}>
    <div className="flex justify-start items-center">
      {' '}
      <span className="font-bold w-6">{rank}</span>
      <div className="flex items-center gap-2">
        <Avatar
          // currently using default avatar
          // in future: pass user.avatar from backend
          size={32}
        />
        <span>{user.name}</span>
      </div>
    </div>

    <span>{user.score}</span>
  </div>
);

export default RankRow;
