import { useNavigate } from 'react-router-dom';

const LevelMapPage = () => {
  const navigate = useNavigate();

  const handlevel = () => {
    navigate('/game-map/play-game'); // Route to game Map
  };
  return (
    <>
      <div className="gameLevelHolder grid grid-cols-4">
        <button onClick={handlevel}>level 1</button>
        <button>level 2</button>
        <button>level 3</button>
        <button>level 4</button>
        <button>level 5</button>
        <button>level 6</button>
        <button>level 7</button>
        <button>level 8</button>
        <button>level 9</button>
        <button>level 10</button>
        <button>level 11</button>
        <button>level 12</button>
      </div>
    </>
  );
};
export default LevelMapPage;
