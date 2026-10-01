import { useAuth } from '@/context/AuthContext';
// src\pages\GameStartPage.tsx
import { useNavigate } from 'react-router';
import { CyberButton, CyberTitle } from '@/components';

export default function GameStartPage() {
  const navigate = useNavigate();
  const { mode } = useAuth();

  const menuButtons = [
    { label: mode === 'account' ? 'CONTINUE' : 'PLAY', onClick: () => navigate('/game-map') },
    { label: 'INFO', onClick: () => navigate('/about-us') },
  ];

  return (
    <div className="relative h-full min-h-0 w-full box-border overflow-hidden flex items-center justify-center p-4">
      <div className="text-center">
        <CyberTitle className="p-8 select-none" size="xl">
          MATCH-3
        </CyberTitle>

        <div className="flex flex-col max-w-xl mx-auto gap-3 items-center mt-5">
          {menuButtons.map((btn) => (
            <CyberButton key={btn.label} label={btn.label} onClick={btn.onClick} />
          ))}
        </div>
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-normal tracking-wide text-cyan-100/65 select-none">© 2026 Jan Ninh</p>
    </div>
  );
}
