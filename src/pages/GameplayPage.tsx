import { GameFooter } from '@/components';
import { GameContainer } from '@/features/playground';
import { useOverlays } from '@/features/overlays';
import { useNavigate } from 'react-router';

export default function GameplayPage() {
  const { openSettings, openWin, openLose } = useOverlays();
  const navigate = useNavigate();

  return (
    <div className="p-8 flex flex-col gap-8">
      <GameContainer />
      <GameFooter openSettings={openSettings} />
      <button type="button" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80" onClick={() => openWin()}>
        test win
      </button>
      <button type="button" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80" onClick={() => openLose()}>
        test lose
      </button>
      <button
        type="button"
        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
        onClick={() => navigate('/game-map')}
      >
        back to map
      </button>
    </div>
  );
}
