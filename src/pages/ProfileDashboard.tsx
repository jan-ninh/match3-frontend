import AccountAvailability from '@/components/AccountAvailability';
import { AvatarSprite, BadgeGrid, ProfileHeader, StatsGrid, Navbar, CyberButton } from '@/components';
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

  const expCurrent = useMemo(() => playerExpTotal % expRequired, [playerExpTotal, expRequired]);

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
      { label: 'Gameplay Score', value: safeTotalScore.toLocaleString() },
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

  if (mode === 'account' && !canUseAccount)
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
    <div className="profile-page flex min-h-full flex-col">
      <div className="shrink-0">
        <Navbar />
      </div>

      <div className="m-4">
        <ProfileHeader
          username={profile.username}
          level={playerLevel}
          expCurrent={expCurrent}
          expRequired={expRequired}
          progressPercent={progressPercent}
          avatar={<AvatarSprite name={profile.avatar as any} size={112} />}
          onAvatarClick={() => setAvatarModalOpen(true)}
          onRefresh={() => {
            void refreshProfile();
          }}
          refreshing={profileRequest === 'loading'}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mx-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2 scrollbar-cyber">
          <StatsGrid stats={stats} />
          <BadgeGrid badges={achievedBadges} />
        </div>
      </div>

      <div className="mt-3 flex shrink-0 justify-center px-6 pb-6">
        <CyberButton label="Back" size="md" onClick={() => navigate('/game-map')} />
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
