// src/features/overlays/SettingsModal.tsx
import { useOverlays } from './useOverlays';
import { useAudio } from '@/context/AudioContext';
import { CyberButton, Modal } from '@/components';

const rangeBase =
  'absolute inset-0 z-10 w-full h-5 appearance-none bg-transparent cursor-pointer ' +
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[6px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:mt-[-7px] ' +
  '[&::-webkit-slider-thumb]:shadow-[0_0_8px_currentColor] ' +
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent ' +
  '[&::-moz-range-progress]:bg-transparent ' +
  '[&::-moz-range-thumb]:w-[6px] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-[1px] [&::-moz-range-thumb]:border-0 ' +
  '[&::-moz-range-thumb]:shadow-[0_0_8px_currentColor]';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setMusicOn, musicVolume, setMusicVolume, setClickSoundOn, clickVolume, setClickVolume, playClickSound } = useAudio();
  const api = useOverlays();
  const isInGame = location.pathname === '/game-map/play-game';

  const handleClose = () => {
    onClose();
    api.openQuitConfirm();
  };

  const restoreDefaults = () => {
    playClickSound();
    setMusicOn(true);
    setClickSoundOn(true);
    setMusicVolume(0);
    setClickVolume(70);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md" panelClassName="select-none !pt-5 !pb-6">
      <div className="pt-3">
        <div className="grid grid-cols-[112px_minmax(0,1fr)_44px] items-center gap-x-4 gap-y-6">
          <span className="text-sm text-cyan-300">Music</span>
          <div className="relative h-5">
            <div className="absolute left-[3px] right-[3px] top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-sm bg-zinc-600 pointer-events-none">
              <div className="h-full bg-cyan-400" style={{ width: `${musicVolume}%` }} />
            </div>
            <input
              aria-label="Music volume"
              type="range"
              min={0}
              max={100}
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className={`${rangeBase} text-cyan-400 [&::-webkit-slider-thumb]:bg-cyan-300 [&::-moz-range-thumb]:bg-cyan-300`}
            />
          </div>
          <span className="text-cyan-400 text-right">{musicVolume}%</span>

          <span className="text-sm text-cyan-300">Sound Effects</span>
          <div className="relative h-5">
            <div className="absolute left-[3px] right-[3px] top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-sm bg-zinc-600 pointer-events-none">
              <div className="h-full bg-pink-400" style={{ width: `${clickVolume}%` }} />
            </div>
            <input
              aria-label="Sound effects volume"
              type="range"
              min={0}
              max={100}
              value={clickVolume}
              onChange={(e) => setClickVolume(Number(e.target.value))}
              className={`${rangeBase} text-pink-400 [&::-webkit-slider-thumb]:bg-pink-300 [&::-moz-range-thumb]:bg-pink-300`}
            />
          </div>
          <span className="text-pink-400 text-right">{clickVolume}%</span>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={restoreDefaults}
            className="px-2 py-2 text-xs uppercase tracking-wider text-cyan-100/50 transition-colors hover:text-cyan-200"
          >
            Restore Defaults
          </button>

          <CyberButton label="Close" onClick={onClose} size="md" />
        </div>

        {isInGame && (
          <div className="mt-3 flex justify-end">
            <CyberButton label="Quit Game" onClick={handleClose} size="sm" />
          </div>
        )}
      </div>
    </Modal>
  );
}
