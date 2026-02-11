import type { User } from '@/types';
import GlassSection from '../GlassSection';

type Props = {
  user: User;
  rank: number;
};

export default function YourPositionCard({ user, rank }: Props) {
  return (
    <GlassSection className="flex justify-between items-center  p-4 mt-4">
      <span className="font-bold">{rank}</span>
      <span>{user.name} (You)</span>
      <span>{user.score}</span>
    </GlassSection>
  );
}
