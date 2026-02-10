import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';

type Props = {
  open: boolean;
  onClose: () => void;
  level?: number;
};

export default function LoseOverlay({ open, onClose, level }: Props) {
  const navigate = useNavigate();

  const backToMap = () => {
    onClose();
    navigate('/game-map');
  };

  return (
    <Modal open={open} onClose={onClose} title="Game Over" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex items-center gap-3 text-3xl font-semibold text-cyan-600">
          <div>You Lost</div>

          {typeof level === 'number' && <div>Level {level}</div>}
        </div>
        <div className="text-cyan-600/70 text-center max-w-[38ch]">Progress was reset. Return to the map to start again from Level 1.</div>
        <CyberButton type="button" onClick={backToMap} className="" label="Return to map" size="md" />
      </div>
    </Modal>
  );
}
