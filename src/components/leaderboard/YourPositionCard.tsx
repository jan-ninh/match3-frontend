import type { User } from '@/types';
import GlassSection from '../GlassSection';
import { AvatarSprite } from '@/components';

type Props = {
  user: User;
  rank: number;
};

export default function YourPositionCard({ user, rank }: Props) {
  return (
    <GlassSection className="flex justify-between items-center gap-2 p-4 mt-4">
      <span className="font-bold">{rank}</span>
      <div className="flex items-center gap-2 min-w-0">
        <AvatarSprite name={(user.avatar as any) || 'default.png'} size={48} />
        <span className="truncate" title={user.name}>
          {user.name} (You)
        </span>
      </div>
      <span className="shrink-0 tabular-nums">{user.score}</span>
    </GlassSection>
  );
}
