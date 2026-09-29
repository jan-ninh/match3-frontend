import AccountAvailability from '@/components/AccountAvailability';
import { AvatarSprite, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, CyberButton, GlassSection } from '@/components';
import badges from '@/data/badges';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useMemo, useState } from 'react';

import ChangeAvatarModal from '@/features/overlays/ChangeAvatarModal';

const EXP_PER_LEVEL = 3000;

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { user, mode, canUseAccount, profile, refreshProfile, generation, isCurrent, profileRequest } = useAuth();

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const safeTotalScore = useMemo(() => {
    const raw = profile?.totalScore ?? 0;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0) return 0;
    return Math.floor(score);
  }, [profile?.totalScore]);

  const playerLevel = useMemo(() => {
    const raw = (profile as unknown as { playerLevel?: unknown } | null)?.playerLevel;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
  }, [profile]);

  const playerExpTotal = useMemo(() => {
    const raw = (profile as unknown as { playerExp?: unknown } | null)?.playerExp;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }, [profile]);

  const expRequired = EXP_PER_LEVEL;

  const expCurrent = useMemo(() => {
    // UI shows current exp within the active level.
    // Overflow is handled server-side via (level, totalExp), but this is safe even if totalExp keeps growing.
    return playerExpTotal % expRequired;
  }, [playerExpTotal, expRequired]);

  const progressPercent = useMemo(() => {
    if (expRequired <= 0) return 0;
    return (expCurrent / expRequired) * 100;
  }, [expCurrent, expRequired]);

  const stats = useMemo(() => {
    if (!profile) return [];

    const wins = typeof profile.gamesWon === 'number' ? profile.gamesWon : 0;

    return [
      { label: 'Wins', value: wins },
      { label: 'Losses', value: profile.gamesLost },
      { label: 'Games Played', value: profile.gamesPlayed },
      { label: 'Score', value: safeTotalScore.toLocaleString() },
      { label: 'Total EXP', value: playerExpTotal.toLocaleString() },
    ];
  }, [profile, safeTotalScore]);

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

  if (mode === 'demo')
    return (
      <>
        <Navbar />
        <p className="text-center p-6">Account stats require account sign-in. Demo progress stays on this device.</p>
      </>
    );
  if (mode === 'legacy-account' && !canUseAccount)
    return (
      <>
        <Navbar />
        <AccountAvailability />
      </>
    );
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
      <div className="shrink-0">
        <Navbar />
      </div>

      <div className="m-4 flex flex-col space-y-4">
        {profileRequest === 'loading' && <p>Updating account data · last confirmed values are read-only.</p>}
        <ProfileHeader
          username={profile.username}
          level={playerLevel}
          avatar={<AvatarSprite name={profile.avatar as any} size={132} />}
          actions={
            <button
              type="button"
              disabled={profileRequest === 'loading'}
              onClick={() => setAvatarModalOpen(true)}
              className="px-4 h-10 rounded-xl border border-white/10 text-cyan-400 hover:text-pink-400 transition-colors duration-200"
            >
              Change avatar
            </button>
          }
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="mx-4 flex flex-col space-y-4 flex-1 min-h-0">
          <GlassSection className="flex flex-col gap-6 p-6 overflow-y-auto scrollbar-cyber flex-1 min-h-0">
            <StatsGrid stats={stats} />
            <GlassSection>
              <ProgressBar percent={progressPercent} playerLevel={playerLevel} expCurrent={expCurrent} expRequired={expRequired} />
            </GlassSection>

            <BadgeGrid badges={achievedBadges} />
          </GlassSection>
        </div>
      </div>

      <div className="shrink-0 px-6 mt-4 pb-10 flex justify-center">
        <CyberButton key={'Back'} label={'Back'} onClick={() => navigate('/game-map')} />
      </div>

      <ChangeAvatarModal
        key={generation}
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        userId={user?.id ?? ''}
        currentAvatar={profile.avatar as any}
        onUpdated={async (newAvatar) => {
          void newAvatar;
          if (isCurrent(generation, user?.id)) await refreshProfile();
        }}
      />
    </div>
  );
}
