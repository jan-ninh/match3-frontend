import { useNavigate } from 'react-router';
import Modal from '@/components/Modal';
import { CyberButton } from '@/components';
import { motion } from 'framer-motion';

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
      <motion.div
        className="flex flex-col items-center gap-4 py-6"
        initial="hidden"
        animate="show"
        exit="hidden"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
        }}
      >
        {/* Headline (با یک shake خیلی کوتاه) */}
        <motion.div
          className="flex items-center gap-3 text-3xl font-semibold text-cyan-600"
          variants={{
            hidden: { opacity: 0, y: 10, filter: 'blur(2px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)' },
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          animate={{
            x: [0, -4, 4, -4, 4, 0], // shake
          }}
        >
          <div className="text-pink-500">You Lost</div>
          {typeof level === 'number' && <div className="text-pink-500">Level {level}</div>}
        </motion.div>

        {/* Message */}
        <motion.div
          className="text-cyan-600/70 text-center max-w-[38ch]"
          variants={{
            hidden: { opacity: 0, y: 10, filter: 'blur(2px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)' },
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          Progress was reset. Return to the map to start again from Level 1.
        </motion.div>

        {/* Divider glow */}
        <motion.div
          className="h-0.5 w-64 rounded-full bg-pink-500/50"
          variants={{
            hidden: { opacity: 0, scaleX: 0.6 },
            show: { opacity: 1, scaleX: 1 },
          }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Button */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <CyberButton type="button" onClick={backToMap} label="Return to map" size="md" />
        </motion.div>
      </motion.div>
    </Modal>
  );
}
