import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';

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
    <Modal open={open} onClose={onClose} title="You Won!" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="text-2xl font-semibold text-cyan-600">Found a key!</div>
        {typeof level === 'number' && <div className="text-lg font-semibold text-cyan-600">Level {level} completed</div>}
        <div className="text-5xl">🗝️</div>

        <CyberButton type="button" label="Return to Map" size="md" onClick={returnToMap} className="" />
      </div>
    </Modal>
  );
}
