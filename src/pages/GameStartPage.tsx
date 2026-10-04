import { useAuth } from '@/context/AuthContext';
import { useGuest } from '@/context/GuestContext';
import { GUEST_STARTING_POWERS } from '@/services/guest/guestStore';
import { useOverlays } from '@/features/overlays';
import Modal from '@/components/Modal';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CyberButton, CyberTitle } from '@/components';

export default function GameStartPage() {
  const navigate = useNavigate();
  const { mode, playDemo } = useAuth();
  const { save, store } = useGuest();
  const { openSettings } = useOverlays();
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const hasGuestRun =
    save.completedStages.length > 0 ||
    save.activeAttempt !== null ||
    save.powers.bomb !== GUEST_STARTING_POWERS.bomb ||
    save.powers.laser !== GUEST_STARTING_POWERS.laser ||
    save.powers.extraShuffle !== GUEST_STARTING_POWERS.extraShuffle;
  const canContinue = mode === 'account' || hasGuestRun;

  const startNewGame = () => {
    const previousRunId = store.getSnapshot().save.runId;
    store.reset();
    if (store.getSnapshot().save.runId === previousRunId) {
      setResetError('Guest progress changed in another tab. Reload before starting a new game.');
      return;
    }
    setConfirmNewGame(false);
    setResetError(null);
    playDemo();
    navigate('/game-map');
  };

  const menuButtons = [
    { label: 'CONTINUE', onClick: () => navigate('/game-map'), disabled: !canContinue, primary: canContinue },
    {
      label: 'NEW GAME',
      onClick: () => {
        setResetError(null);
        if (hasGuestRun) setConfirmNewGame(true);
        else startNewGame();
      },
      primary: !canContinue,
    },
    { label: 'SETTINGS', onClick: openSettings },
    { label: 'INFO', onClick: () => navigate('/about-us') },
  ];

  return (
    <div className="relative h-full min-h-0 w-full box-border overflow-hidden flex items-center justify-center p-4">
      <div className="text-center">
        <CyberTitle className="p-8 select-none translate-x-[3px]" size="xl">
          MATCH-3
        </CyberTitle>

        <div className="flex flex-col max-w-xl mx-auto gap-3 items-center mt-5">
          {menuButtons.map((btn) => (
            <CyberButton
              key={btn.label}
              label={btn.label}
              onClick={btn.onClick}
              disabled={btn.disabled}
              size={btn.primary ? 'lg' : 'md'}
              className={btn.disabled ? 'opacity-35' : btn.primary ? '' : 'opacity-80'}
            />
          ))}
        </div>
        {mode === 'account' && <p className="mt-3 text-sm text-cyan-100/70">New Game starts a local Demo campaign.</p>}
        {resetError && !confirmNewGame && (
          <p role="alert" className="mt-3 text-sm text-pink-300">
            {resetError}
          </p>
        )}
      </div>

      <Modal open={confirmNewGame} onClose={() => setConfirmNewGame(false)} title="Start a new game?" size="sm" closeOnBackdrop={false}>
        <p className="text-center text-cyan-100">Your current local campaign progress and powers will be reset.</p>
        {resetError && (
          <p role="alert" className="mt-3 text-sm text-pink-300">
            {resetError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <CyberButton label="Cancel" size="sm" onClick={() => setConfirmNewGame(false)} />
          <CyberButton label="NEW GAME" size="sm" onClick={startNewGame} />
        </div>
      </Modal>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-normal tracking-wide text-cyan-100/65 select-none">© 2026 Jan Ninh</p>
    </div>
  );
}
