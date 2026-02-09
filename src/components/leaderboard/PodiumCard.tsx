import Avatar from '../Avatar';
import type { User } from '@/types';

type Props = {
  user: User;
  position: number;
};

export default function PodiumCard({ user, position }: Props) {
  const height = position === 1 ? 'h-48' : position === 2 ? 'h-36' : 'h-32';
  const bgColor = position === 1 ? 'bg-yellow-400/50' : position === 2 ? 'bg-gray-400/50' : 'bg-orange-300/50';

  return (
    <div className={`flex flex-col items-center rounded-xl w-24 ${height} ${bgColor} mx-2`}>
      <div className="w-full h-12 text-white flex items-center justify-center font-bold" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}>
        {position}
      </div>
      <div className="flex-1 flex flex-col justify-end items-center p-2 text-gray-900">
        <Avatar size={48} />
        <span className="font-semibold">{user.name}</span>
        <span className="text-sm">{user.score} pts</span>
      </div>
    </div>
  );
}
