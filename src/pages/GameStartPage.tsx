import { useNavigate } from 'react-router';
import { CyberButton, CyberTitle } from '@/components';

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
        <CyberTitle className="p-8" size="xl">
          MATCH-3
        </CyberTitle>

        <div className="flex flex-col max-w-xl mx-auto gap-3 items-center">
          {menuButtons.map((btn) => (
            <CyberButton key={btn.label} label={btn.label} onClick={btn.onClick} />
          ))}
        </div>
      </div>
    </div>
  );
}
