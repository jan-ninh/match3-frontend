import type { User } from '@/types';
import { Avatar } from '@/components';

type Props = {
  user: User;
  rank: number;
};

export default function RankRow({ user, rank }: Props) {
  return (
    <div className="flex justify-between items-center rounded-xl bg-white p-4 mb-2">
      <div className="flex items-center gap-2">
        <span className="font-bold w-6">{rank}</span>
        <Avatar size={32} />
        <span>{user.name}</span>
      </div>
      <span>{user.score}</span>
    </div>
  );
}