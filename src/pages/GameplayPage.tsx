import { GameFooter } from '@/components';
import { GameContainer } from '@/features/playground';
import { useOverlays } from '@/features/overlays';

export default function GameplayPage() {
  const { openSettings, openPowerChoice, openWin, openLose } = useOverlays();

  return (
    <div className="p-4">
      <GameContainer />
      <GameFooter openSettings={openSettings} openPowerChoice={openPowerChoice} openWin={openWin} openLose={openLose} />
    </div>
  );
}
