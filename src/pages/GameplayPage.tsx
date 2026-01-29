import { GameContainer } from '@/components';

const GameplayPage = () => {
  return (
    <>
      <div>
        <div>time</div>
        <div>target</div>
        <div>moves</div>
      </div>

      <div className="palyboardHolder">
        <GameContainer></GameContainer>
      </div>
      <div>
        <button>setting</button>
        <button>tipp</button>
        <button>Power 1</button>
        <button>Power 2</button>
        <button>Power 3</button>
      </div>
    </>
  );
};
export default GameplayPage;
