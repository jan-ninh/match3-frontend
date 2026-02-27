// src/pages/ProfileDashboard.tsx
import { AvatarSprite, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, CyberButton, GlassSection } from '@/components';
import badges from '@/data/badges';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';

//
import ChangeAvatarModal from '@/features/overlays/ChangeAvatarModal';
const MAX_LEVEL = 12;

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(!!user);

  // Redirect to guest home if user becomes null (e.g., due to session expiration)
  useEffect(() => {
    if (wasAuthenticated && user === null) {
      console.log('👤 Session expired, redirecting to guest home...');
      navigate('/game-map', { replace: true });
    }
    setWasAuthenticated(!!user);
  }, [user, navigate]);

  useEffect(() => {
    console.log('ProfileDashboard mounted/updated:', { user: user?.id, profileLoaded: !!profile });
  }, [user, profile]);

  useEffect(() => {
    console.log('ProfileDashboard mounted/updated:', { user: user?.id, profileLoaded: !!profile });
  }, [user, profile]);

  // Refresh profile on mount and when visibility/focus changes
  useEffect(() => {
    const refresh = () => {
      console.log('🔄 Triggering profile refresh...');
      void refreshProfile().catch((err) => {
        console.error('❌ Failed to refresh profile:', err);
      });
    };

    // Initial refresh on mount
    refresh();

    // Refresh when window regains focus
    const onFocus = () => {
      console.log('👁️ Window focused - refreshing profile');
      refresh();
    };
    window.addEventListener('focus', onFocus);

    // Refresh when tab becomes visible
    const onVisibility = () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible - refreshing profile');
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshProfile]);

  const safeTotalScore = useMemo(() => {
    const raw = profile?.totalScore ?? user?.totalScore ?? 0;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0) return 0;
    return Math.floor(score);
  }, [profile?.totalScore, user?.totalScore]);

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
    return Math.min(MAX_LEVEL, Math.max(1, highestCompletedStage + 1));
  }, [highestCompletedStage]);

  const stats = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Wins', value: profile.gamesWon },
      { label: 'Losses', value: profile.gamesLost },
      { label: 'Games Played', value: profile.gamesPlayed },
      { label: 'Score', value: safeTotalScore.toLocaleString() },
    ];
  }, [profile, safeTotalScore]);

  const progressPercent = useMemo(() => {
    return (level / MAX_LEVEL) * 100;
  }, [level]);

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
              <ProgressBar percent={progressPercent} currentLevel={level} maxLevel={MAX_LEVEL} />
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
          void newAvatar;
          await refreshProfile().catch(() => {});
        }}
      />
    </div>
  );
}
