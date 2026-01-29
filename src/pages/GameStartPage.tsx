import { useNavigate } from 'react-router-dom';

const GameStartPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/game-map'); // Route to game Map
  };

  const handleAboutUs = () => {
    navigate('/about-us'); // Route to game Map
  };
  const handleQuit = () => {
    navigate('/'); // Route to game Map
  };
  return (
    <>
      <h1>Match-3</h1>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleAboutUs}>About us</button>
      <button onClick={handleQuit}>Quit</button>
    </>
  );
};
export default GameStartPage;
