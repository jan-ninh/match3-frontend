import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useRead } from '@/services/network/useRead';
import ReadFailure from '@/components/ReadFailure';
import { CyberButton, GlassSection, Navbar, PodiumCard, RankRow, YourPositionCard } from '@/components';
import { apiLeaderboardTop10, apiLeaderboardOwnRank } from '@/api/leaderboard';
import { leaderboardPresentation } from '@/api/leaderboardShape';
import { useAuth } from '@/context/AuthContext';
import { backendReadiness } from '@/api/http';
import { useAccountReadiness } from '@/services/network/useAccountReadiness';
function OwnPosition() {
  const { user, generation, profile } = useAuth();
  const load = useCallback((signal: AbortSignal) => apiLeaderboardOwnRank(signal), []);
  const read = useRead('rank:' + user!.id + ':' + generation + ':' + profile?.revision, load);
  if (read.status === 'loading') return <p>Loading your rank...</p>;
  if (read.status === 'error') return <ReadFailure title="Your rank unavailable" error={read.error!} retry={read.retry} />;
  if (!read.data?.best) return <p>No completed campaign result yet.</p>;
  return (
    <div>
      <p>Your best completed campaign · rank {read.data.rank}</p>
      <YourPositionCard user={read.data.best} rank={read.data.rank!} />
    </div>
  );
}
export default function LeaderboardPage() {
  const navigate = useNavigate();
  const readiness = useAccountReadiness();
  const { mode, canUseAccount, generation, profile } = useAuth();
  const load = useCallback(async (signal: AbortSignal) => {
    await backendReadiness.waitForReady(signal);
    return apiLeaderboardTop10(signal);
  }, []);
  const read = useRead('canonical-top:' + generation + ':' + profile?.revision + ':' + readiness, load);
  const rows = read.data ?? [],
    state = leaderboardPresentation(read.status, read.data);
  return (
    <div className="leaderboard-page flex flex-col min-h-full">
      <Navbar />
      <GlassSection className="text-center max-w-xl mx-auto mb-4 w-full">
        <p>Best completed campaigns · stages 1–11</p>
        <p>Optional sandbox scores are excluded.</p>
        {state === 'loading' && <p>Loading leaderboard...</p>}
        {state === 'unavailable' && <ReadFailure title="Leaderboard unavailable" error={read.error!} retry={read.retry} />}
        {state === 'empty' && <p>No completed campaigns yet.</p>}
        {state === 'ready' && (
          <div className="podium-list flex justify-center items-end gap-1 sm:gap-4">
            {[
              { user: rows[1], order: 1, position: 2 },
              { user: rows[0], order: 2, position: 1 },
              { user: rows[2], order: 3, position: 3 },
            ]
              .filter((x) => x.user)
              .map((x) => (
                <div key={x.user.id} style={{ order: x.order }}>
                  <PodiumCard user={x.user} position={x.position} />
                </div>
              ))}
          </div>
        )}
      </GlassSection>
      <GlassSection className="text-center max-w-xl mx-auto w-full overflow-y-auto scrollbar-cyber flex-1 min-h-0">
        {state === 'ready' && rows.slice(3).map((player) => <RankRow key={player.id} user={player} rank={player.rank} />)}
        {mode === 'account' && canUseAccount && <OwnPosition key={generation} />}
        {mode === 'account' && !canUseAccount && <p>Account rank is unavailable until your account is verified and reachable.</p>}
      </GlassSection>
      <div className="shrink-0 px-6 pt-4 pb-10 flex justify-center">
        <CyberButton label="Back" onClick={() => navigate('/game-map')} />
      </div>
    </div>
  );
}
