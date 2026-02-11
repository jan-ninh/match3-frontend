import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CyberButton, GlassSection, Navbar, PodiumCard, RankRow, YourPositionCard } from '@/components';
import type { User } from '@/types';
import { apiLeaderboardTop10 } from '@/api/leaderboard';
import { useAuth } from '@/context/AuthContext';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiLeaderboardTop10()
      .then((items) => {
        if (!isMounted) return;
        setUsers(items);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load leaderboard');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentUserId = user?.id;

  const sorted = useMemo(() => [...users].sort((a, b) => b.score - a.score), [users]);
  const topThree = sorted.slice(0, 3);
  const restTopTen = sorted.slice(3, 10);

  const currentIndex = currentUserId ? sorted.findIndex((u) => u.id === currentUserId) : -1;
  const currentUser = currentIndex >= 0 ? sorted[currentIndex] : undefined;
  const currentRank = currentIndex >= 0 ? currentIndex + 1 : undefined;

  return (
    <>
      <Navbar />
      <GlassSection className="text-center max-w-xl mx-auto">
        {loading && <div className="text-center text-gray-500 py-8">Loading leaderboard...</div>}
        {!loading && error && <div className="text-center text-red-600 py-8">{error}</div>}

        {!loading && !error && (
          <>
            <div className="flex justify-center items-end mb-6 flex-wrap sm:flex-nowrap gap-4">
              {[
                { user: topThree[1], order: 1, position: 2 },
                { user: topThree[0], order: 2, position: 1 },
                { user: topThree[2], order: 3, position: 3 },
              ]
                .filter((x) => x.user)
                .map((x) => (
                  <div key={`${x.position}-${x.user?.id ?? x.user?.name ?? x.order}`} style={{ order: x.order }}>
                    <PodiumCard user={x.user!} position={x.position} />
                  </div>
                ))}
            </div>

            <div>
              {restTopTen.map((user, idx) => (
                <RankRow key={`${user.id ?? user.name ?? 'row'}-${idx}`} user={user} rank={idx + 4} />
              ))}
            </div>

            {currentUser && currentRank && currentRank > 10 && (
              <div className="mt-4">
                <YourPositionCard user={currentUser} rank={currentRank} />
              </div>
            )}

            {!sorted.length && <div className="text-center text-gray-500 py-8">No leaderboard data yet.</div>}
          </>
        )}
      </GlassSection>

      <div className="m-6 flex justify-center">
        <CyberButton key={'Back'} label={'Back'} onClick={() => navigate('/game-map')} />
      </div>
    </>
  );
}
