// src/pages/ProfileDashboard.tsx
import { AvatarSprite, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, CyberButton, GlassSection } from '@/components';
import badges from '@/data/badges';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';

//
import ChangeAvatarModal from '@/features/overlays/ChangeAvatarModal';

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // Refresh profile when component mounts (e.g., returning from game)
  useEffect(() => {
    refreshProfile().catch(() => {});
  }, []);

  // Auto-refresh profile when page regains focus
  useEffect(() => {
    const handleFocus = () => {
      refreshProfile().catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshProfile]);

  const safeTotalScore = useMemo(() => {
    if (!profile) return 0;
    const score = Number(profile.totalScore);
    if (!Number.isFinite(score) || score < 0) return 0;
    return Math.floor(score);
  }, [profile]);

  const highestCompletedStage = useMemo(() => {
    if (!profile) return 0;

    let highest = 0;
    for (const [key, data] of Object.entries(profile.progress || {})) {
      if (!data?.completed) continue;
      const n = Number.parseInt(key.replace('stage', ''), 10);
      if (Number.isFinite(n) && n > highest) highest = n;
    }

    return highest;
  }, [profile]);

  const level = useMemo(() => {
    // Profile level should reflect stage progression, not raw score buckets.
    return Math.min(12, Math.max(1, highestCompletedStage + 1));
  }, [highestCompletedStage]);

  const currentStage = useMemo(() => (highestCompletedStage > 0 ? `stage${highestCompletedStage}` : null), [highestCompletedStage]);

  const stats = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Wins', value: profile.gamesWon },
      { label: 'Losses', value: profile.gamesLost },
      { label: 'Games Played', value: profile.gamesPlayed },
      { label: 'XP', value: safeTotalScore.toLocaleString() },
    ];
  }, [profile, safeTotalScore]);

  const progressPercent = useMemo(() => {
    if (!profile) return 0;
    const stageNum = currentStage ? parseInt(currentStage.replace('stage', ''), 10) : 1;
    const expectedPoints = stageNum * 1000;
    return Math.min((safeTotalScore / expectedPoints) * 100, 100);
  }, [safeTotalScore, profile, currentStage]);

  const achievedBadges = useMemo(() => {
    if (!profile) return badges;
    const unlockedKeys = new Set(profile.badges.map((b) => b.badgeKey));
    return badges.map((badge) => ({
      id: badge.id,
      label: badge.label,
      icon: badge.icon,
      unlocked: unlockedKeys.has(badge.id),
    }));
  }, [profile]);

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="m-8 max-w-xl mx-auto flex flex-col space space-y-4">
          <p className="text-center text-cyan-100/40">Loading profile...</p>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ✅ Navbar top - relative position */}
      <div className="shrink-0">
        <Navbar />
      </div>

      <div className="m-4 flex flex-col space-y-4">
        <ProfileHeader
          username={profile.username}
          level={level}
          avatar={<AvatarSprite name={profile.avatar as any} size={132} />}
          actions={
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="px-4 h-10 rounded-xl border border-white/10 text-cyan-400 hover:text-pink-400 transition-colors duration-200"
            >
              Change avatar
            </button>
          }
        />
      </div>
      {/* ✅ Content scrollable - flex-1 overflow-y-auto */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mx-4 flex flex-col space-y-4 flex-1 min-h-0">
          <GlassSection className="flex flex-col gap-6 p-6 overflow-y-auto scrollbar-cyber flex-1 min-h-0">
            <StatsGrid stats={stats} />
            <GlassSection>
              <ProgressBar percent={progressPercent} />
            </GlassSection>

            <BadgeGrid badges={achievedBadges} />
          </GlassSection>
        </div>
      </div>

      {/* ✅ Back button bottom - flex-shrink-0 */}
      <div className="shrink-0 px-6 mt-4 pb-10 flex justify-center">
        <CyberButton
          key={'Back'}
          label={'Back'}
          onClick={async () => {
            await refreshProfile();
            navigate('/game-map');
          }}
        />
      </div>

      {/* Modal */}
      <ChangeAvatarModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        userId={user?.id ?? ''}
        currentAvatar={profile.avatar as any}
        onUpdated={async (newAvatar) => {
          if (profile) {
            profile.avatar = newAvatar;
          }
          await refreshProfile().catch(() => {});
        }}
      />
    </div>
  );
}
