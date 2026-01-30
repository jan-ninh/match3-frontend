import { useNavigate } from 'react-router';
import { apiRequest } from '@/services/apiClient';
import { useState } from 'react';
import { Button } from '@/components';

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
      <h1 className="text-3xl font-bold mb-4 text-center p-4">Match-3</h1>
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col space-y-2 items-center">
          <Button onClick={handleStart} label="PLAY" />
          <Button onClick={handleAboutUs} label="ABOUT US" />
          <Button onClick={handleQuit} label="QUIT" />
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <button onClick={checkHealth} className="underline hover:text-white transition">
          Check Backend Health
        </button>
        <p>{health}</p>
      </div>
    </>
  );
};

export default GameStartPage;
