// src/features/overlays/SettingsModal.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useOverlays } from './useOverlays';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import { useGuest } from '@/context/GuestContext';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { CyberButton, Modal } from '@/components';

type SettingsView = 'menu' | 'sound' | 'confirmMap' | 'confirmHome';

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
  const [view, setView] = useState<SettingsView>('menu');
  const location = useLocation();
  const navigate = useNavigate();
  const api = useOverlays();

  const { mode } = useAuth();
  const { store: guestStore } = useGuest();
  const { store: accountStore } = useAccountOutcome();

  const {
    setMusicOn,
    musicVolume,
    setMusicVolume,
    setClickSoundOn,
    clickVolume,
    setClickVolume,
    playClickSound,
  } = useAudio();

  const isMainMenu = location.pathname === '/';
  const isInGame = location.pathname === '/game-map/play-game';
  const isAccount = mode === 'account';

  useEffect(() => {
    if (open) setView('menu');
  }, [open]);

  const restoreDefaults = () => {
    playClickSound();
    setMusicOn(true);
    setClickSoundOn(true);
    setMusicVolume(0);
    setClickVolume(70);
  };

  const openAccount = () => {
    onClose();

    if (isAccount) {
      navigate('/game-map/profile');
      return;
    }

    api.openLogin();
  };

  const leaveActiveRun = () => {
    if (!isInGame) return;

    if (mode === 'demo') guestStore.leave();
    else void accountStore.abandon();
  };

  const confirmReturnToMap = () => {
    leaveActiveRun();
    onClose();
    navigate('/game-map');
  };

  const confirmMainMenu = () => {
    leaveActiveRun();
    onClose();
    navigate('/');
  };

  const title =
    view === 'sound'
      ? 'Sound'
      : view === 'confirmMap'
        ? 'Return to\nLevel Map?'
        : view === 'confirmHome'
          ? isInGame
            ? 'Quit to\nMain Menu?'
            : 'Return to\nMain Menu?'
          : 'Settings';

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" panelClassName="select-none !pt-5 !pb-6">
      {view === 'menu' && (
        <div className="flex flex-col items-center pt-4">
          <div className="flex w-full flex-col items-center gap-3">
            <CyberButton label="Sound" onClick={() => setView('sound')} size="md" />

            {isMainMenu && <CyberButton label={isAccount ? 'Account' : 'Login'} onClick={openAccount} size="md" />}

            {isInGame && <CyberButton label="Return to Map" onClick={() => setView('confirmMap')} size="md" />}

            {!isMainMenu && <CyberButton label={isInGame ? 'Quit' : 'Main Menu'} onClick={() => setView('confirmHome')} size="md" />}
          </div>

          <div className="mt-8 flex justify-center">
            <CyberButton label={isInGame ? 'Resume' : 'Close'} onClick={onClose} size="sm" />
          </div>
        </div>
      )}

      {view === 'sound' && (
        <div className="pt-3">
          <div className="grid grid-cols-[112px_minmax(0,1fr)_44px] items-center gap-x-4 gap-y-6">
            <span className="text-sm text-cyan-300">Music</span>
            <div className="relative h-5">
              <div className="pointer-events-none absolute left-[3px] right-[3px] top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-sm bg-zinc-600">
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
            <span className="text-right text-cyan-400">{musicVolume}%</span>

            <span className="text-sm text-cyan-300">Sound Effects</span>
            <div className="relative h-5">
              <div className="pointer-events-none absolute left-[3px] right-[3px] top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-sm bg-zinc-600">
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
            <span className="text-right text-pink-400">{clickVolume}%</span>
          </div>

          <div className="mt-9 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={restoreDefaults}
              className="px-2 py-2 text-xs uppercase tracking-wider text-cyan-100/50 transition-colors hover:text-cyan-200"
            >
              Restore Defaults
            </button>

            <CyberButton label="Back" onClick={() => setView('menu')} size="sm" />
          </div>
        </div>
      )}

      {view === 'confirmMap' && (
        <div className="flex flex-col items-center gap-4 py-5">
          <div className="text-center text-base font-semibold text-cyan-200">
            {mode === 'demo' ? 'Used boosters will not be refunded!' : 'Leaving resets this account run. Player level and EXP remain.'}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <CyberButton label="Cancel" size="sm" onClick={() => setView('menu')} />
            <CyberButton label="Return to Map" size="sm" onClick={confirmReturnToMap} />
          </div>
        </div>
      )}

      {view === 'confirmHome' && (
        <div className="flex flex-col items-center gap-4 py-5">
          {isInGame ? (
            <div className="text-center text-base font-semibold text-cyan-200">
              {mode === 'demo' ? 'Used boosters will not be refunded!' : 'Leaving resets this account run. Player level and EXP remain.'}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-3">
            <CyberButton label="Cancel" size="sm" onClick={() => setView('menu')} />
            <CyberButton label={isInGame ? 'Quit' : 'Return to Main Menu'} size="sm" onClick={confirmMainMenu} />
          </div>
        </div>
      )}
    </Modal>
  );
}
