import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getProgress, unlockLevel } from '@/services/progress/progressActions';
import type { Progress, LevelId } from '@/services/progress/ProgressStore';
import LevelGrid from '@/components/level/LevelGrid';

const LevelMapPage = () => {
  const navigate = useNavigate();

  // Holds the player's progress (unlocked, completed levels, etc.)
  const [progress, setProgress] = useState<Progress | null>(null);

  // Load player progress once when the page mounts
  useEffect(() => {
    void (async () => {
      const p = await getProgress(); // fetch progress from store / backend
      setProgress(p); // save it in state
    })();
  }, []);

  // Called when a user clicks on an unlocked level
  // Navigates to the game page with the selected level
  const handleLevel = (level: LevelId) => {
    navigate(`/game-map/play-game?level=${level}`);
  };

  // Test helper: manually unlock level 2
  const unlockLevel2 = async () => {
    const next = await unlockLevel(2);
    setProgress(next);
  };

  if (!progress) {
    return <p>Loading levels…</p>;
  }

  return (
    <>
      <div className="flex flex-col pt-16">
        <h1 className="text-xl font-bold mb-4 text-center">Level Map</h1>

        {/* Level grid UI
          - Receives progress data
          - Receives a callback to handle level selection */}
        <LevelGrid progress={progress} onSelect={handleLevel} />

        {/* Temporary debug button for testing unlock logic */}
      </div>
      <button onClick={unlockLevel2} className="mb-4">
        Unlock Level 2 (test)
      </button>
    </>
  );
};

export default LevelMapPage;
