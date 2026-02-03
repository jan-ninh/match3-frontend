import { useNavigate } from 'react-router';
import { Button } from '@/components';

export default function GameStartPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Match-3</h1>

        <div className="flex flex-col gap-3 items-center">
          <Button label="PLAY" onClick={() => navigate('/game-map')} className="bg-neutral-800 hover:bg-neutral-700" />
          <Button label="ABOUT US" onClick={() => navigate('/about-us')} className="bg-neutral-800 hover:bg-neutral-700" />
          <Button label="QUIT" onClick={() => navigate('/')} className="bg-neutral-800 hover:bg-neutral-700" />
        </div>
      </div>
    </div>
  );
}