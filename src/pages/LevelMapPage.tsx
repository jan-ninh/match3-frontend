import { useGuest } from '@/context/GuestContext';
import { guestStageAccess } from '@/services/guest/guestStore';
import GuestStatus from '@/components/GuestStatus';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Navbar, LevelGrid, CyberTitle } from '@/components';
import type { LevelId, Progress } from '@/services/progress/ProgressStore';
import { apiProfile } from '@/api/user';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile } from '@/types';

export default function LevelMapPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress | null>(null);

  const { user } = useAuth();
  const { save, store } = useGuest();
  const guestAccess = guestStageAccess(save);
  const visibleProgress = user
    ? progress
    : { completedLevels: save.completedStages, unlockedLevels: guestAccess.playableStages, lastPlayedLevel: save.lastPlayedStage };

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

  useEffect(() => {
    let disposed = false;

    void (async () => {
      // Guest progress is read directly from GuestStore above.
      if (!user?.id) return;

      try {
        const profile = await apiProfile(user.id);
        if (disposed) return;
        setProgress(profileToProgress(profile));
      } catch {
        if (disposed) return;
        // Do not trust local client progress for authenticated users.
        setProgress({ unlockedLevels: [1], completedLevels: [], lastPlayedLevel: 1 });
      }
    })();

    return () => {
      disposed = true;
    };
  }, [user?.id]);

  const onSelect = (level: LevelId) => {
    navigate(`/game-map/play-game?level=${level}`);
  };

  if (!visibleProgress) return <div className="p-6">Loading levels...</div>;

  return (
    <>
      <Navbar />
      <div className="p-6">
        <CyberTitle size="md" className="text-center">
          Level Map
        </CyberTitle>
        <GuestStatus />
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
        <LevelGrid progress={visibleProgress} playableStages={user ? undefined : guestAccess.playableStages} onSelect={onSelect} />
      </div>
    </>
  );
}
