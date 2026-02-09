import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Navbar, LevelGrid } from '@/components';
import { getProgress } from '@/services/progress/progressActions';
import { useOverlays } from '@/features/overlays';
import type { LevelId, Progress } from '@/services/progress/ProgressStore';

export default function LevelMapPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress | null>(null);
  const { openPowerChoice } = useOverlays();

  useEffect(() => {
    void (async () => {
      const p = await getProgress();
      setProgress(p);
    })();
  }, []);

  const onSelect = (level: LevelId) => {
    openPowerChoice({
      title: 'Choose your Power!',
      onChoose: () => navigate(`/game-map/play-game?level=${level}`),
    });
  };

  if (!progress) return <div className="p-6">Loading levels…</div>;

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4 text-center">Level Map</h1>
        <LevelGrid progress={progress} onSelect={onSelect} />
      </div>
    </>
  );
}
