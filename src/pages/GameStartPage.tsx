import { useAuth } from '@/context/AuthContext';
// src\pages\GameStartPage.tsx
import GuestStatus from '@/components/GuestStatus';
import { useNavigate } from 'react-router';
import { CyberButton, CyberTitle } from '@/components';

export default function GameStartPage() {
  const navigate = useNavigate();
  const { mode } = useAuth();

  const menuButtons = [
    { label: mode === 'account' ? 'CONTINUE' : 'PLAY DEMO', onClick: () => navigate('/game-map') },
    { label: 'ABOUT US', onClick: () => navigate('/about-us') },
  ];

  return (
    <div className="h-full min-h-0 w-full box-border overflow-hidden flex items-center justify-center p-4">
      <div className="text-center">
        <CyberTitle className="p-8" size="xl">
          MATCH-3
        </CyberTitle>

        <p className="mb-3 text-cyan-100/80">Match tiles. Master 11 stages. No signup needed.</p>
        <GuestStatus />
        <div className="flex flex-col max-w-xl mx-auto gap-3 items-center mt-5">
          {menuButtons.map((btn) => (
            <CyberButton key={btn.label} label={btn.label} onClick={btn.onClick} />
          ))}
        </div>
      </div>
    </div>
  );
}
