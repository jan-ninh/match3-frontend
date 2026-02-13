import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';
import { motion } from 'framer-motion';

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
      <motion.div
        className="flex flex-col items-center gap-6 py-6"
        initial="hidden"
        animate="show"
        exit="hidden"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
        }}
      >
        <motion.div
          className="text-2xl font-semibold text-cyan-600"
          variants={{
            hidden: { opacity: 0, y: 8, filter: 'blur(2px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)' },
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          Found a key!
        </motion.div>

        {typeof level === 'number' && (
          <motion.div
            className="text-lg font-semibold text-cyan-600"
            variants={{
              hidden: { opacity: 0, y: 8, filter: 'blur(2px)' },
              show: { opacity: 1, y: 0, filter: 'blur(0px)' },
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            Level {level} completed
          </motion.div>
        )}

        {/* Reward icon with pulse */}
        <motion.div
          className="text-6xl drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]"
          variants={{
            hidden: { opacity: 0, scale: 0.9 },
            show: { opacity: 1, scale: 1 },
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          animate={{
            scale: [1, 1.06, 1],
            filter: ['blur(0px)', 'blur(0px)', 'blur(0px)'],
          }}
        >
          🗝️
        </motion.div>

        {/* Subtle glow bar (cyber vibe) */}
        <motion.div
          className="h-0.5 w-56 rounded-full bg-cyan-400/70"
          variants={{
            hidden: { opacity: 0, scaleX: 0.5 },
            show: { opacity: 1, scaleX: 1 },
          }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center' }}
        />

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <CyberButton type="button" label="Return to Map" size="md" onClick={returnToMap} />
        </motion.div>
      </motion.div>
    </Modal>
  );
}
