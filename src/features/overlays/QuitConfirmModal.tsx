import { useAccountOutcome } from '@/context/OutcomeContext';
import { useGuest } from '@/context/GuestContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';
import type { QuitDestination } from './overlayContext';

type Props = {
  open: boolean;
  onClose: () => void;
  destination?: QuitDestination;
};

export default function QuitConfirmModal({ open, onClose, destination = 'map' }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { store } = useGuest();
  const { mode } = useAuth();
  const { store: account } = useAccountOutcome();

  const isInGame = location.pathname === '/game-map/play-game';
  const isReturnToMap = destination === 'map';

  const title = isReturnToMap ? 'Return to Level Map?' : isInGame ? 'Quit to Main Menu?' : 'Return to Main Menu?';
  const confirmLabel = isReturnToMap ? 'Return to Map' : isInGame ? 'Quit to Main Menu' : 'Return';

  const back = () => onClose();

  const confirm = () => {
    if (isInGame) {
      if (mode === 'demo') store.leave();
      else void account.abandon();
    }

    onClose();
    navigate(destination === 'home' ? '/' : '/game-map');
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        {isInGame && (
          <div className="text-center text-base font-semibold text-cyan-200">
            {mode === 'demo' ? 'Used boosters will not be refunded!' : 'Leaving resets this account run. Player level and EXP remain.'}
          </div>
        )}

        {!isInGame && destination === 'home' && (
          <div className="text-center text-base font-semibold text-cyan-200/90">Return to the main menu?</div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <CyberButton type="button" label={isInGame ? 'Keep playing' : 'Cancel'} size="sm" onClick={back} className="" />
          <CyberButton type="button" label={confirmLabel} size="sm" onClick={confirm} className="" />
        </div>
      </div>
    </Modal>
  );
}
