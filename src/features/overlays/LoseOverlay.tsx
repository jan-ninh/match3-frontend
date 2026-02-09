import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';

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
    <Modal open={open} onClose={onClose} title="" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-2xl font-semibold">Game over</div>
        {typeof level === 'number' ? <div className="text-white/70">Level {level}</div> : null}
        <div className="text-white/70 text-center max-w-[38ch]">Progress was reset. Return to the map to start again from Level 1.</div>

        <button type="button" onClick={backToMap} className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          return to map
        </button>
      </div>
    </Modal>
  );
}
