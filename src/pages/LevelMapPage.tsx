import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Navbar, LevelGrid, CyberTitle } from '@/components';
import { getProgress } from '@/services/progress/progressActions';
import type { LevelId, Progress } from '@/services/progress/ProgressStore';
import { apiProfile } from '@/api/user';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile } from '@/types';

function uniqSorted(levels: number[]): number[] {
  return Array.from(new Set(levels)).sort((a, b) => a - b);
}

function mergeProgress(a: Progress, b: Progress): Progress {
  const lastA = a.lastPlayedLevel ?? 1;
  const lastB = b.lastPlayedLevel ?? 1;

  return {
    unlockedLevels: uniqSorted([...(a.unlockedLevels ?? []), ...(b.unlockedLevels ?? [])]),
    completedLevels: uniqSorted([...(a.completedLevels ?? []), ...(b.completedLevels ?? [])]),
    lastPlayedLevel: Math.max(lastA, lastB),
  };
}

export default function LevelMapPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress | null>(null);

  const { user } = useAuth();

  const highestCompletedRef = useRef(0);

  const profileToProgress = (profile: UserProfile): Progress => {
    const completedLevels = Object.entries(profile.progress || {})
      .filter(([, data]) => data?.completed)
      .map(([key]) => Number.parseInt(key.replace('stage', ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    const highestCompleted = completedLevels.length ? Math.max(...completedLevels) : 0;
    highestCompletedRef.current = highestCompleted;

    const unlockedLevels = Array.from(new Set([1, ...completedLevels, ...(highestCompleted > 0 ? [highestCompleted + 1] : [])])).sort((a, b) => a - b);

    return {
      unlockedLevels,
      completedLevels: completedLevels.sort((a, b) => a - b),
      lastPlayedLevel: highestCompleted || 1,
    };
  };

  useEffect(() => {
    void (async () => {
      const local = await getProgress().catch(() => null);

      if (user?.id) {
        try {
          const profile = await apiProfile(user.id);
          const fromProfile = profileToProgress(profile);

          setProgress(local ? mergeProgress(fromProfile, local) : fromProfile);
        } catch {
          // backend unavailable => fall back to local progress
          if (local) {
            setProgress(local);
          } else {
            setProgress({ unlockedLevels: [1], completedLevels: [], lastPlayedLevel: 1 });
          }
        }
        return;
      }

      // guest => local progress only
      if (local) {
        setProgress(local);
      } else {
        const p = await getProgress();
        setProgress(p);
      }
    })();
  }, [user?.id]);

  const onSelect = (level: LevelId) => {
    navigate(`/game-map/play-game?level=${level}`);
  };

  if (!progress) return <div className="p-6">Loading levels…</div>;

  return (
    <>
      <Navbar />
      <div className="p-6">
        <CyberTitle size="md" className="text-center">
          Level Map
        </CyberTitle>
        <LevelGrid progress={progress} onSelect={onSelect} />
      </div>
    </>
  );
}
