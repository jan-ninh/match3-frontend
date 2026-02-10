import { CyberButton } from '@/components';
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const buttonStyles = {
  base: 'px-4 py-3 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center',
  sound: {
    on: 'bg-cyan-800 text-cyan-200 border border-cyan-400 shadow-md hover:shadow-lg',
    off: 'bg-pink-800 text-pink-200 border border-pink-400 shadow-md hover:shadow-lg',
  },
  graphics: {
    default: 'px-6 py-2 rounded-md text-cyan-100 border border-cyan-500/30 hover:scale-105 transition-transform',
    selected: 'bg-cyan-600 text-white shadow-lg',
  },
  feedback: '',
  close: '',
};

export default function SettingsModal({ open, onClose }: Props) {
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(70);
  const [graphics, setGraphics] = useState<'low' | 'medium' | 'high'>('high');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 p-8 rounded-2xl bg-linear-to-b from-purple-950/50 to-black/70 backdrop-blur-xl border border-cyan-500/30 shadow-lg text-cyan-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-3xl font-black tracking-widest uppercase text-center mb-10 bg-linear-to-r from-cyan-400 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
          Settings
        </h2>

        {/* Close X */}
        <button onClick={onClose} className="absolute top-5 right-6 text-cyan-300 hover:text-pink-400 text-2xl font-bold transition-colors">
          ×
        </button>

        <div className="flex flex-col gap-7">
          {/* Sound + Volume */}
          <div className="flex items-center gap-4">
            <button onClick={() => setSoundOn(!soundOn)} className={`${buttonStyles.base} ${soundOn ? buttonStyles.sound.on : buttonStyles.sound.off}`}>
              <img src={soundOn ? '/icons/sound-on.svg' : '/icons/sound-off.svg'} alt={soundOn ? 'Sound On' : 'Sound Off'} className="w-6 h-6" />
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 h-2.5 rounded-sm cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Graphics */}
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold tracking-wide text-center">Graphics</span>
            <div className="flex gap-3 justify-center">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setGraphics(level)}
                  className={`${buttonStyles.graphics.default} ${graphics === level ? buttonStyles.graphics.selected : ''}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="flex justify-center">
            <CyberButton label="Send Feedback" onClick={() => alert('Feedback form coming soon!')} className={buttonStyles.feedback} />
          </div>

          {/* Close main button */}
          <div className="flex justify-center">
            <CyberButton label="Close" onClick={onClose} className={buttonStyles.close} />
          </div>
        </div>
      </div>
    </div>
  );
}
