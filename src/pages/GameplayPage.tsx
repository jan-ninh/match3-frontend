import { GameContainer, GameFooter } from '@/components';
import { useOverlays } from '@/overlays';

const GameplayPage = () => {
  const { openSettings, openPowerChoice, openWin, openLose } = useOverlays();

  return (
    <>
      <div className="palyboardHolder">
        <GameContainer />
      </div>
      <GameFooter openSettings={openSettings} openPowerChoice={openPowerChoice} openWin={openWin} openLose={openLose} />
    </>
  );
};

export default GameplayPage;
