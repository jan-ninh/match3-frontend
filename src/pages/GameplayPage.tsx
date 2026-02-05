import { GameFooter, Header } from '@/components';
import { GameContainer } from '@/features/playground';
import { useOverlays } from '@/features/overlays';

export default function GameplayPage() {
  const { openSettings, openPowerChoice, openWin, openLose } = useOverlays();

  return (
    <div className="p-8 flex flex-col gap-8">
      <Header time={'120'} moves={45} targetLabel="Collect 40 Red" />
      <GameContainer />
      <GameFooter openSettings={openSettings} openPowerChoice={openPowerChoice} openWin={openWin} openLose={openLose} />
    </div>
  );
}
