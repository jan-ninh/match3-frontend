import type { User } from '@/types';
import { AvatarSprite, GlassSection } from '@/components';

type Props = {
  user: User;
  rank: number;
};

export default function RankRow({ user, rank }: Props) {
  return (
    <GlassSection className="flex justify-between items-center  p-4 mb-2">
      <div className="flex items-center gap-2">
        <span className="font-bold w-6">{rank}</span>
        <AvatarSprite name={(user.avatar as any) || 'default.png'} size={48} />
        <span>{user.name}</span>
      </div>
      <span>{user.score}</span>
    </GlassSection>
  );
}
