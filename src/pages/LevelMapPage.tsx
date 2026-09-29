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
import type { UserProfile } from '@/types';

export default function LevelMapPage() {
  const navigate = useNavigate();

  const { user, mode, canUseAccount, profile, profileRequest } = useAuth();
  const { save, store } = useGuest();
  const guestAccess = guestStageAccess(save);

  const profileToProgress = (profile: UserProfile): Progress => {
    const completedLevels = Object.entries(profile.progress || {})
      .filter(([, data]) => data?.completed)
      .map(([key]) => Number.parseInt(key.replace('stage', ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);

    const highestCompleted = completedLevels.length ? Math.max(...completedLevels) : 0;

    const unlockedLevels = Array.from(new Set([1, ...(highestCompleted > 0 ? [highestCompleted + 1] : [])])).sort((a, b) => a - b);

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

  if (mode === 'legacy-account' && !canUseAccount)
    return (
      <>
        <Navbar />
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
      <div className="p-6">
        <CyberTitle size="md" className="text-center">
          Level Map
        </CyberTitle>
        <GuestStatus />
        <AccountPersistenceStatus />
        {mode === 'legacy-account' && profileRequest === 'loading' && (
          <p className="text-center">Updating account data · last confirmed values are read-only.</p>
        )}
        {!user && (
          <div className="text-center my-4">
            {guestAccess.campaignComplete && <p>Campaign complete! Optional sandbox 12 is unlocked.</p>}
            <button
              type="button"
              className="border border-cyan-300 rounded px-4 py-2"
              onClick={() => {
                if (window.confirm('Start a new guest run? This resets local campaign progress and powers.')) store.reset();
              }}
            >
              New Run / Reset
            </button>
          </div>
        )}
        <LevelGrid
          progress={visibleProgress}
          playableStages={user ? (outcomeStore.blocked(user.id) || profileRequest === 'loading' ? [] : undefined) : guestAccess.playableStages}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}
