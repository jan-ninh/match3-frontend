// src/features/overlays/OverlayLevelUp.tsx
import Modal from '@/components/Modal';
import type { PowerId } from './overlayContext';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onChoose: (powerId: PowerId) => void;
};

const powerIds: PowerId[] = ['gridlaser', 'laser', 'extraShuffle'];

export default function OverlayLevelUp({ open, title, onClose, onChoose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Level Up" size="md" closeOnBackdrop={false}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-2xl font-semibold text-cyan-600">{title}</div>

        <div className="flex gap-3 mt-2">
          {powerIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChoose(id)}
              className="px-3 py-2 rounded-lg text-black hover:bg-yellow-400 flex items-center justify-center"
              aria-label={`choose ${id}`}
            >
              <img src={`/icons/${id}.png`} alt={id} className="w-8 h-8" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
