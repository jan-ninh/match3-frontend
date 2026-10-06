import AccountAvailability from '@/components/AccountAvailability';
import AccountPersistenceStatus from '@/components/AccountPersistenceStatus';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { useGuest } from '@/context/GuestContext';
import { guestStageAccess } from '@/services/guest/guestStore';
import GuestStatus from '@/components/GuestStatus';
import { useNavigate } from 'react-router';
import { Navbar, LevelGrid, CyberTitle } from '@/components';
import type { LevelId, Progress } from '@/services/progress/ProgressStore';
import { useAuth } from '@/context/AuthContext';
import type { CurrentUser } from '@/api/profileShape';

export default function LevelMapPage() {
  const navigate = useNavigate();

  const { user, mode, canUseAccount, profile, profileRequest } = useAuth();
  const { save } = useGuest();
  const guestAccess = guestStageAccess(save);

  const profileToProgress = (profile: CurrentUser): Progress => {
    const completedLevels = Object.entries(profile.progress || {})
      .filter(([, data]) => data?.completed)
      .map(([key]) => Number.parseInt(key.replace('stage', ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);

    const highestCompleted = profile.frontier - 1;

    const unlockedLevels = [profile.frontier];

    return {
      unlockedLevels,
      completedLevels,
      lastPlayedLevel: highestCompleted || 1,
    };
  };

  const { store: outcomeStore } = useAccountOutcome();
  const visibleProgress = user
    ? canUseAccount && profile
      ? profileToProgress(profile)
      : null
    : { completedLevels: save.completedStages, unlockedLevels: guestAccess.playableStages, lastPlayedLevel: save.lastPlayedStage };

  const onSelect = (level: LevelId) => {
    navigate(`/game-map/play-game?level=${level}`);
  };

  if (mode === 'account' && !canUseAccount)
    return (
      <>
        <Navbar />
        <AccountPersistenceStatus />
        <AccountAvailability />
      </>
    );
  if (!visibleProgress)
    return (
      <>
        <Navbar />
        <AccountAvailability />
      </>
    );

  return (
    <>
      <Navbar />
      <div className="level-map-page">
        <div className="level-map-heading">
          <CyberTitle size="md" className="level-map-title text-center !text-[30px] md:!text-[34px]">
            Level Map
          </CyberTitle>
        </div>

        <GuestStatus />
        <AccountPersistenceStatus />

        {mode === 'account' && profileRequest === 'loading' && (
          <p className="text-center">Updating account data · last confirmed values are read-only.</p>
        )}

        {!user && guestAccess.campaignComplete && (
          <div className="my-4 text-center">
            <p>Campaign complete! Optional sandbox 12 is unlocked.</p>
          </div>
        )}

        <div className="level-map-grid-slot">
          <LevelGrid
            progress={visibleProgress}
            playableStages={user ? (!outcomeStore.canStart() || profileRequest === 'loading' ? [] : [profile!.frontier]) : guestAccess.playableStages}
            onSelect={onSelect}
          />
        </div>
      </div>
    </>
  );
}
