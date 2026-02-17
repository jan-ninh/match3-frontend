import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function QuitConfirmModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  const back = () => onClose();
  const quit = () => {
    onClose();
    navigate('/game-map');
  };

  return (
    <Modal open={open} onClose={onClose} title="Are you sure?" size="sm" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-2xl font-semibold text-cyan-600">Used boosters will not be refunded!</div>

        <div className="flex gap-3">
          <CyberButton type="button" label="back" size="sm" onClick={back} className="" />
          <CyberButton type="button" label="quit" size="sm" onClick={quit} className="" />
        </div>
      </div>
    </Modal>
  );
}
