import type { User } from '@/types';
import GlassSection from '../GlassSection';
import { AvatarSprite } from '@/components';

type Props = {
  user: User;
  rank: number;
};

export default function YourPositionCard({ user, rank }: Props) {
  return (
    <GlassSection className="flex justify-between items-center  p-4 mt-4">
      <span className="font-bold">{rank}</span>
      <div className="flex items-center gap-2">
        <AvatarSprite name={(user.avatar as any) || 'default.png'} size={32} />
        <span>{user.name} (You)</span>
      </div>
      <span>{user.score}</span>
    </GlassSection>
  );
}
