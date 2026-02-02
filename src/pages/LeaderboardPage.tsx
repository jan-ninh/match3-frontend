import { PodiumCard, RankRow, YourPositionCard } from '@/components';
import { THEME_CONFIG } from '@/components/leaderboard/theme';

export type User = {
  id: string;
  name: string;
  score: number;
};

type LeaderboardPageProps = {
  users?: User[];
  currentUserId?: string;
};

const LeaderboardPage = ({
  users = [],
  currentUserId = '11', // default test user
}: LeaderboardPageProps) => {
  // ---------- test users fallback ----------
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

  // Choose source users (fallback to testUsers) and sort by score desc
  const sortedUsers = [...(users.length > 0 ? users : testUsers)].sort((a, b) => b.score - a.score);

  // Top three users for podium
  const topThree = sortedUsers.slice(0, 3);

  // Users ranked 4..10 (max 7 users)
  const restTopTen = sortedUsers.slice(3, 10);

  // Find current user and their rank (1-based)
  const currentUserIndex = currentUserId ? sortedUsers.findIndex((u) => u.id === currentUserId) : -1;
  const currentUser = currentUserIndex >= 0 ? sortedUsers[currentUserIndex] : undefined;
  const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : undefined;

  return (
    <div className={`max-w-xl mx-auto ${THEME_CONFIG.colors.bg} p-6 ${THEME_CONFIG.borderRadius}`} role="region" aria-label="Leaderboard">
      {/* Podium: second place left, first place center, third place right */}
      <div className="flex justify-center items-end mb-6 flex-wrap sm:flex-nowrap gap-4">
        {[
          { user: topThree[1], order: 1, position: 2 },
          { user: topThree[0], order: 2, position: 1 },
          { user: topThree[2], order: 3, position: 3 },
        ]
          .filter((item) => item.user)
          .map((item) => (
            <div key={item.user!.id} style={{ order: item.order }}>
              <PodiumCard user={item.user!} position={item.position} />
            </div>
          ))}
      </div>

      {/* Rank rows for positions 4..10 */}
      <div>
        {restTopTen.map((user, idx) => (
          <RankRow key={user.id} user={user} rank={idx + 4} />
        ))}
      </div>

      {/* Display current user if outside top 10 */}
      {currentUser && currentUserRank && currentUserRank > 10 && (
        <div className="mt-4" aria-live="polite">
          <YourPositionCard user={currentUser} rank={currentUserRank} />
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
