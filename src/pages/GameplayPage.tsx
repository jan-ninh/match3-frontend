import { GameContainer } from '@/components';
import { useOverlays } from '@/overlays';

const GameplayPage = () => {
  const { openSettings, openPowerChoice, openWin, openLose } = useOverlays();

  return (
    <>
      <div>
        <div>time</div>
        <div>target</div>
        <div>moves</div>
      </div>

      <div className="palyboardHolder">
        <GameContainer />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={openSettings}>
          setting
        </button>

        <button type="button" onClick={() => openPowerChoice({ title: 'Choose your Power!' })}>
          power choice
        </button>

        {/* Debug buttons (kannst du später entfernen) */}
        <button type="button" onClick={() => openWin(1)}>
          debug win
        </button>
        <button type="button" onClick={() => openLose(1)}>
          debug lose
        </button>
      </div>
    </>
  );
};

export default GameplayPage;
