import { useMemo } from 'react';
import { PodiumCard, RankRow, YourPositionCard } from '@/components';
import { THEME_CONFIG } from '@/components/leaderboard/theme';

export type User = {
  id: string;
  name: string;
  score: number;
};

type LeaderboardPageProps = {
  users?: User[]; // optional to avoid runtime errors
  currentUserId?: string;
};

const LeaderboardPage = ({
  users = [], // default empty array
  currentUserId = '11', // test user id
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
    { id: '11', name: 'Karl', score: 720 }, // user outside top 10
  ];

  // Choose source users. If `users` is empty use testUsers.
  // Then create a sorted copy by score (descending).
  const sortedUsers = useMemo(() => {
    const source = users.length > 0 ? users : testUsers;
    // copy and sort so we don't mutate props
    return [...source].sort((a, b) => b.score - a.score);
  }, [users]);

  // Top three (may contain fewer than 3 items)
  const topThree = sortedUsers.slice(0, 3);
  // The rest to show in rows (ranks 4..10 -> up to 7 users)
  const restTopTen = sortedUsers.slice(3, 10);

  // Find current user index and rank (1-based). currentUser may be undefined.
  const currentUserIndex = sortedUsers.findIndex((u) => u.id === currentUserId);
  const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : undefined;
  const currentUser = currentUserIndex >= 0 ? sortedUsers[currentUserIndex] : undefined;

  return (
    <div className={`max-w-xl mx-auto ${THEME_CONFIG.colors.bg} p-6 ${THEME_CONFIG.borderRadius}`} role="region" aria-label="Leaderboard">
      {/* Podium: show up to three users.
          Layout: second on the left, first center, third right.
          Use inline `order` (style) to avoid dynamic Tailwind classes. */}
      <div className="flex justify-center items-end mb-6 flex-wrap sm:flex-nowrap gap-4">
        {/*
          Build an array with the visual order we want.
          - If a slot is missing (e.g. fewer than 3 users), we filter it out.
        */}
        {[
          { user: topThree[1], visualOrder: 1, position: 2 }, // second place (left)
          { user: topThree[0], visualOrder: 2, position: 1 }, // first place (center)
          { user: topThree[2], visualOrder: 3, position: 3 }, // third place (right)
        ]
          .filter((item) => item.user) // keep only available users
          .map((item) => (
            <div
              key={item.user!.id}
              // Use inline style order to control layout without Tailwind dynamic classes
              style={{ order: item.visualOrder }}
              // keep layout responsive; PodiumCard handles its own content
            >
              <PodiumCard user={item.user!} position={item.position} />
            </div>
          ))}
      </div>

      {/* Rank rows for positions 4..10 */}
      <div>
        {restTopTen.map((user, idx) => (
          // idx starts at 0 so rank is idx + 4
          <RankRow key={user.id} user={user} rank={idx + 4} />
        ))}
      </div>

      {/* If current user exists and is outside top 10, show their position */}
      {currentUser && currentUserRank && currentUserRank > 10 && (
        <div className="mt-4" aria-live="polite">
          <YourPositionCard user={currentUser} rank={currentUserRank} />
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
