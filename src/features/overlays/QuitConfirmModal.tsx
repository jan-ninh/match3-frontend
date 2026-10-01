import { useAccountOutcome } from '@/context/OutcomeContext';
import { useGuest } from '@/context/GuestContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function QuitConfirmModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { store } = useGuest();
  const { mode } = useAuth();
  const { store: account } = useAccountOutcome();

  const back = () => onClose();
  const quit = () => {
    if (mode === 'demo') store.leave();
    else void account.abandon();
    onClose();
    navigate('/game-map');
  };

  return (
    <Modal open={open} onClose={onClose} title="Are you sure?" size="sm" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-base text-center font-semibold text-cyan-200">
          {mode === 'demo' ? 'Used boosters will not be refunded!' : 'Quit resets this account run. Player level and EXP remain.'}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <CyberButton type="button" label="Keep playing" size="sm" onClick={back} className="" />
          <CyberButton type="button" label="Quit" size="sm" onClick={quit} className="" />
        </div>
      </div>
    </Modal>
  );
}
