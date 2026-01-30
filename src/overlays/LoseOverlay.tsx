import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';
import { useOverlays } from './useOverlays';

type Props = {
  open: boolean;
  onClose: () => void;
  level?: number;
};

export default function LoseOverlay({ open, onClose, level }: Props) {
  const navigate = useNavigate();
  const { openQuitConfirm } = useOverlays();

  const retry = () => {
    onClose();
    const lvl = typeof level === 'number' ? level : 1;
    navigate(`/game-map/play-game?level=${lvl}`);
  };

  const quit = () => {
    onClose();
    openQuitConfirm();
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-2xl font-semibold">Game over</div>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={retry} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            Retry
          </button>
          <button type="button" onClick={quit} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            Quit
          </button>
        </div>
      </div>
    </Modal>
  );
}
