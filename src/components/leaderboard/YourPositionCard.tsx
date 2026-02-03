import type { User } from '@/types';

type Props = {
  user: User;
  rank: number;
};

export default function YourPositionCard({ user, rank }: Props) {
  return (
    <div className="flex justify-between items-center rounded-xl bg-blue-100 p-4 mt-4">
      <span className="font-bold">{rank}</span>
      <span>
        {user.name} (You)
      </span>
      <span>{user.score}</span>
    </div>
  );
}