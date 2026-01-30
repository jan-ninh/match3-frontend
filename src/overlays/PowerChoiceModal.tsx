import Modal from '@/components/Modal';
import type { PowerId } from './overlayContext';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onChoose: (powerId: PowerId) => void;
};

export default function PowerChoiceModal({ open, title, onClose, onChoose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="text-xl font-semibold">{title}</div>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={() => onChoose('power-1')} className="px-4 py-2 rounded-lg bg-yellow-400/80 text-black hover:bg-yellow-400">
            1
          </button>
          <button type="button" onClick={() => onChoose('power-2')} className="px-4 py-2 rounded-lg bg-yellow-400/80 text-black hover:bg-yellow-400">
            2
          </button>
          <button type="button" onClick={() => onChoose('power-3')} className="px-4 py-2 rounded-lg bg-yellow-400/80 text-black hover:bg-yellow-400">
            3
          </button>
        </div>
      </div>
    </Modal>
  );
}
