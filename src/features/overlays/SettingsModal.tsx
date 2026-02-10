// Example: SettingsModal
import { useState } from 'react';
import { useOverlays } from './useOverlays';
import { CyberButton, Modal } from '@/components';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(70);
  const [graphics, setGraphics] = useState<'low' | 'medium' | 'high'>('high');
  const api = useOverlays();
  const isInGame = location.pathname === '/game-map/play-game';
  const handleClose = () => {
    onClose(); // close settings
    api.openQuitConfirm(); // open quit confirm
  };
  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md">
      {/* Sound + Volume */}
      <div className="flex items-center gap-4 mb-6">
        <button className={`px-4 py-3 rounded-xl ${soundOn ? 'bg-cyan-800' : 'bg-pink-800'}`} onClick={() => setSoundOn(!soundOn)}>
          <img src={soundOn ? '/icons/sound-on.svg' : '/icons/sound-off.svg'} alt="Sound toggle" className="w-6 h-6" />
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
      <div className="flex justify-center items-center gap-3 mb-6">
        <p className="text-cyan-600">Graphics:</p>
        {(['low', 'medium', 'high'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGraphics(g)}
            className={`px-6 py-2 rounded-md text-cyan-100 border ${graphics === g ? 'bg-cyan-600 text-white shadow-lg' : 'border-cyan-500/30'}`}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div className="flex justify-center my-4">
        <CyberButton label="Send Feedback" onClick={() => alert('Feedback coming soon!')} size="md" />
      </div>

      {/* Close main button */}
      <div className="flex justify-center my-4">
        <CyberButton label="Close" onClick={onClose} size="md" />
      </div>
      {isInGame && (
        <div className="flex justify-center">
          <CyberButton label="Quit Game" onClick={handleClose} size="md" />
        </div>
      )}
    </Modal>
  );
}
