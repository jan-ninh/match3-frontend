import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/apiClient';
import { useState } from 'react';

type HealthResponse = {
  ok: boolean;
};

const GameStartPage = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<string>('not checked');

  const handleStart = () => {
    navigate('/game-map');
  };

  const handleAboutUs = () => {
    navigate('/about-us');
  };

  const handleQuit = () => {
    navigate('/');
  };

  const checkHealth = async () => {
    try {
      const res = await apiRequest<HealthResponse>('/health');
      setHealth(res.ok ? 'backend ok ✅' : 'backend not ok ❌');
    } catch (err) {
      setHealth('backend error ❌');
      console.error(err);
    }
  };

  return (
    <>
      <h1>Match-3</h1>

      <button onClick={handleStart}>Start</button>
      <button onClick={handleAboutUs}>About us</button>
      <button onClick={handleQuit}>Quit</button>

      <hr />

      <button onClick={checkHealth}>Check Backend Health</button>
      <p>{health}</p>
    </>
  );
};

export default GameStartPage;
