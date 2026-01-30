import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  level?: number;
};

export default function WinOverlay({ open, onClose, level }: Props) {
  const navigate = useNavigate();

  const returnToMap = () => {
    onClose();
    navigate('/game-map');
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="text-2xl font-semibold">Found a key!</div>

        {typeof level === 'number' && <div className="text-white/70">Level {level} completed</div>}

        <div className="text-5xl">🗝️</div>

        <button type="button" onClick={returnToMap} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          return to map
        </button>
      </div>
    </Modal>
  );
}
