// src/features/overlays/SettingsModal.tsx
import { useOverlays } from './useOverlays';
import { useAudio } from '@/context/AudioContext';
import { CyberButton, Modal } from '@/components';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { musicOn, setMusicOn, musicVolume, setMusicVolume, clickSoundOn, setClickSoundOn, clickVolume, setClickVolume } = useAudio();

  const api = useOverlays();
  const isInGame = location.pathname === '/game-map/play-game';

  const handleClose = () => {
    onClose(); // close settings
    api.openQuitConfirm(); // open quit confirm
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md">
      {/* Background Music Volume */}
      <div className="mb-6">
        <p className="text-cyan-600 mb-2">Background Music:</p>
        <div className="flex items-center gap-4">
          <button
            aria-label="Toggle music"
            aria-pressed={musicOn}
            className={`px-4 py-3 rounded-xl transition-colors ${musicOn ? 'bg-cyan-800' : 'bg-pink-800'}`}
            onClick={() => setMusicOn(!musicOn)}
          >
            <img src={musicOn ? '/icons/sound-on.svg' : '/icons/sound-off.svg'} alt="Sound toggle" className="w-6 h-6" />
          </button>

          <input
            aria-label="Music volume"
            type="range"
            min={0}
            max={100}
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            className="flex-1 h-2.5 rounded-sm cursor-pointer accent-cyan-400"
          />

          <span className="text-cyan-400 w-10 text-right">{musicVolume}%</span>
        </div>
      </div>

      {/* Click Sound Volume */}
      <div className="mb-6">
        <p className="text-cyan-600 mb-2">Effects Sound:</p>
        <div className="flex items-center gap-4">
          <button
            aria-label="Toggle effects"
            aria-pressed={clickSoundOn}
            className={`px-4 py-3 rounded-xl transition-colors ${clickSoundOn ? 'bg-cyan-800' : 'bg-pink-800'}`}
            onClick={() => setClickSoundOn(!clickSoundOn)}
          >
            <img src={clickSoundOn ? '/icons/sound-on.svg' : '/icons/sound-off.svg'} alt="Click sound toggle" className="w-6 h-6" />
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={clickVolume}
            onChange={(e) => setClickVolume(Number(e.target.value))}
            className="flex-1 h-2.5 rounded-sm cursor-pointer accent-pink-400"
          />

          <span className="text-pink-400 w-10 text-right">{clickVolume}%</span>
        </div>
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
