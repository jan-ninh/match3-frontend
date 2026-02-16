import type { User } from '@/types';
import { AvatarSprite, GlassSection } from '@/components';

type Props = {
  user: User;
  rank: number;
};

export default function RankRow({ user, rank }: Props) {
  return (
    <GlassSection className="flex justify-between items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="font-bold w-5">{rank}</span>
        <AvatarSprite name={(user.avatar as any) || 'default.png'} size={32} />
        <span>{user.name}</span>
      </div>
      <span>{user.score}</span>
    </GlassSection>
  );
}
