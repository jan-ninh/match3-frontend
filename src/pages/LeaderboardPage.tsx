import { Navbar, PodiumCard, RankRow, YourPositionCard } from '@/components';
import type { User } from '@/types';

type Props = {
  users?: User[];
  currentUserId?: string;
};

export default function LeaderboardPage({ users = [], currentUserId = '11' }: Props) {
  const testUsers: User[] = [
    { id: '1', name: 'Alice', score: 1200 },
    { id: '2', name: 'Bob', score: 1100 },
    { id: '3', name: 'Charlie', score: 1050 },
    { id: '4', name: 'David', score: 980 },
    { id: '5', name: 'Eve', score: 950 },
    { id: '6', name: 'Frank', score: 900 },
    { id: '7', name: 'Grace', score: 850 },
    { id: '8', name: 'Hannah', score: 800 },
    { id: '9', name: 'Ian', score: 780 },
    { id: '10', name: 'Jane', score: 750 },
    { id: '11', name: 'Karl', score: 720 },
  ];

  const sorted = [...(users.length ? users : testUsers)].sort((a, b) => b.score - a.score);
  const topThree = sorted.slice(0, 3);
  const restTopTen = sorted.slice(3, 10);

  const currentIndex = sorted.findIndex((u) => u.id === currentUserId);
  const currentUser = currentIndex >= 0 ? sorted[currentIndex] : undefined;
  const currentRank = currentIndex >= 0 ? currentIndex + 1 : undefined;

  return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto bg-gray-100 text-gray-900 p-6 rounded-xl">
        <div className="flex justify-center items-end mb-6 flex-wrap sm:flex-nowrap gap-4">
          {[
            { user: topThree[1], order: 1, position: 2 },
            { user: topThree[0], order: 2, position: 1 },
            { user: topThree[2], order: 3, position: 3 },
          ]
            .filter((x) => x.user)
            .map((x) => (
              <div key={x.user!.id} style={{ order: x.order }}>
                <PodiumCard user={x.user!} position={x.position} />
              </div>
            ))}
        </div>

        <div>
          {restTopTen.map((user, idx) => (
            <RankRow key={user.id} user={user} rank={idx + 4} />
          ))}
        </div>

        {currentUser && currentRank && currentRank > 10 && (
          <div className="mt-4">
            <YourPositionCard user={currentUser} rank={currentRank} />
          </div>
        )}
      </div>
    </>
  );
}
