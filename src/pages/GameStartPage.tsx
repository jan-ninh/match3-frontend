import { useNavigate } from 'react-router';
import { Button } from '@/components';

export default function GameStartPage() {
  const navigate = useNavigate();

  const menuButtons = [
    { label: 'PLAY', onClick: () => navigate('/game-map') },
    { label: 'ABOUT US', onClick: () => navigate('/about-us') },
    { label: 'QUIT', onClick: () => navigate('/') },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Match-3</h1>

        <div className="flex flex-col max-w-xl mx-auto gap-3 items-center">
          {menuButtons.map((btn) => (
            <Button key={btn.label} label={btn.label} onClick={btn.onClick} />
          ))}
        </div>
      </div>
    </div>
  );
}
