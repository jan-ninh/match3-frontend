import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProgress, unlockLevel } from '@/services/progress/progressActions';
import type { Progress, LevelId } from '@/services/progress/ProgressStore';

const LevelMapPage = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    void (async () => {
      const p = await getProgress();
      setProgress(p);
    })();
  }, []);

  // später: navigate(`/game-map/play-game?level=${level}`) oder route param
  const handleLevel = (level: LevelId) => {
    navigate(`/game-map/play-game?level=${level}`);
  };

  const unlockLevel2 = async () => {
    const next = await unlockLevel(2);
    setProgress(next);
  };

  const unlocked = new Set(progress?.unlockedLevels ?? []);

  return (
    <>
      <h2>Level Map</h2>

      <button onClick={unlockLevel2} disabled={!progress}>
        Unlock Level 2 (test)
      </button>

      <div className="gameLevelHolder grid grid-cols-4 gap-2 mt-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((level) => {
          const isUnlocked = unlocked.has(level);

          return (
            <button key={level} onClick={() => handleLevel(level)} disabled={!isUnlocked}>
              level {level} {isUnlocked ? '' : '🔒'}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default LevelMapPage;
