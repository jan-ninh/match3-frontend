import Modal from '@/components/Modal';
import Lottie from 'lottie-react';
import confettiAnimation from '@/assets/fx/confetti on transparent background.json';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PowerId } from './overlayContext';
import { useAudio } from '@/context/AudioContext';
type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onChoose: (powerId: PowerId) => void;
};

const powerIds: PowerId[] = ['bomb', 'laser', 'extraShuffle'];

export default function PowerChoiceModal({ open, title, onClose, onChoose }: Props) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { playWinSound } = useAudio();
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
    // confetti
    setShowConfetti(true);

    // Reward application + backend persistence are handled by DevtoolsHost onChoose.
    onChoose(id);
    playWinSound();
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
