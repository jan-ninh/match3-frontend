import Modal from '@/components/Modal';
import { usePowers } from '@/context/PowerContext';
import Lottie from 'lottie-react';
import confettiAnimation from '@/assets/fx/confetti on transparent background.json';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PowerKey, Powers } from '@/types';
import type { PowerId } from './overlayContext';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onChoose: (powerId: PowerId) => void;
};

const powerIds: PowerId[] = ['bomb', 'laser', 'extraShuffle'];

function getChoiceBonus(id: PowerId): number {
  return id === 'bomb' ? 2 : 1;
}

export default function PowerChoiceModal({ open, title, onClose, onChoose }: Props) {
  const { powers, setPowers } = usePowers();
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset confetti
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const onPick = (id: PowerId) => {
    // instant local reward
    const key = id as unknown as PowerKey;
    const bonus = getChoiceBonus(id);

    const next: Powers = {
      ...powers,
      [key]: ((powers[key] ?? 0) | 0) + bonus,
    };

    setPowers(next);

    // confetti
    setShowConfetti(true);

    // existing flow (likely backend sync / overlay close)
    onChoose(id);
  };

  return (
    <>
      {showConfetti &&
        createPortal(
          <div className="fixed inset-0 pointer-events-none z-50">
            <Lottie
              animationData={confettiAnimation}
              loop={false}
              autoplay={true}
              style={{
                width: '100%',
                height: '100%',
                transform: 'scale(1.5)',
              }}
            />
          </div>,
          document.body,
        )}

      <Modal open={open} onClose={onClose} title="Boosters" size="md" closeOnBackdrop={false}>
        <div className="relative overflow-hidden">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-2xl font-semibold text-cyan-600">{title}</div>

            <div className="flex gap-3 mt-2">
              {powerIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPick(id)}
                  className="px-3 py-2 rounded-lg text-black hover:bg-yellow-400 flex items-center justify-center"
                  aria-label={`choose ${id}`}
                >
                  <img src={`/icons/${id}.svg`} alt={id} className="w-8 h-8" loading="lazy" draggable={false} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
