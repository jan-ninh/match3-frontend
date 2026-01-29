import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function QuitConfirmModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  const back = () => onClose();

  const quit = () => {
    onClose();
    navigate('/');
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="sm" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-lg text-white/90">you will lose 1 heart</div>

        <div className="flex gap-3">
          <button type="button" onClick={back} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            back
          </button>
          <button type="button" onClick={quit} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            quit
          </button>
        </div>
      </div>
    </Modal>
  );
}
