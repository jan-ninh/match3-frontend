import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Navbar, LevelGrid } from '@/components';
import { getProgress, unlockLevel } from '@/services/progress/progressActions';
import { useOverlays } from '@/features/overlays';
import type { LevelId, Progress } from '@/services/progress/ProgressStore';
import { apiProfile } from '@/api/user';
import { useAuth } from '@/context/AuthContext';
import type { Powers, UserProfile } from '@/types';
import { usePowers } from '@/context/PowerContext';

export default function LevelMapPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress | null>(null);
  const { openPowerChoice } = useOverlays();
  const { user } = useAuth();
  const { setFromBackendAndSelect } = usePowers();

  const highestCompletedRef = useRef(0);

  const profileToProgress = (profile: UserProfile): Progress => {
    const completedLevels = Object.entries(profile.progress || {})
      .filter(([, data]) => data?.completed)
      .map(([key]) => Number.parseInt(key.replace('stage', ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    const highestCompleted = completedLevels.length ? Math.max(...completedLevels) : 0;
    highestCompletedRef.current = highestCompleted;

    const unlockedLevels = Array.from(
      new Set([1, ...completedLevels, ...(highestCompleted > 0 ? [highestCompleted + 1] : [])]),
    ).sort((a, b) => a - b);

    return {
      unlockedLevels,
      completedLevels: completedLevels.sort((a, b) => a - b),
      lastPlayedLevel: highestCompleted || 1,
    };
  };

  useEffect(() => {
    void (async () => {
      if (user?.id) {
        const profile = await apiProfile(user.id);
        setProgress(profileToProgress(profile));
      } else {
        const p = await getProgress();
        setProgress(p);
      }
    })();
  }, [user?.id]);

  const onSelect = (level: LevelId) => {
    openPowerChoice({
      title: 'Choose your Power!',
      onChoose: async (powerId) => {
        const fallback: Powers = { bomb: 0, rocket: 0, extraTime: 0 };
        try {
          if (user?.id) {
            const profile = await apiProfile(user.id);
            setFromBackendAndSelect(profile.powers ?? fallback, powerId);
          } else {
            setFromBackendAndSelect(fallback, powerId);
          }
        } catch {
          setFromBackendAndSelect(fallback, powerId);
        }
        navigate(`/game-map/play-game?level=${level}`);
      },
    });
  };

  const unlockLevel2 = async () => {
    const last = highestCompletedRef.current || 1;
    const nextLevel = last + 1;
    const next = await unlockLevel(nextLevel);
    setProgress(next);
  };

  if (!progress) return <div className="p-6">Loading levels…</div>;

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4 text-center">Level Map</h1>
        <LevelGrid progress={progress} onSelect={onSelect} />

        <div className="mt-6 flex justify-center">
          <button onClick={unlockLevel2} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            Unlock Level 2 (test)
          </button>
        </div>
      </div>
    </>
  );
}
