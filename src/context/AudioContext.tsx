// src/context/AudioContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import clickSoundFile from '@/assets/sound/CLICK.wav';
import winSoundFile from '@/assets/sound/win.wav';
type AudioContextType = {
  // Background Music
  musicOn: boolean;
  setMusicOn: (value: boolean) => void;
  musicVolume: number;
  setMusicVolume: (value: number) => void;

  // Effects (Click)
  clickSoundOn: boolean;
  setClickSoundOn: (value: boolean) => void;
  clickVolume: number;
  setClickVolume: (value: number) => void;

  playClickSound: () => void;
  playWinSound: () => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(70);

  const [clickSoundOn, setClickSoundOn] = useState(true);
  const [clickVolume, setClickVolume] = useState(70);

  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showEnableSound, setShowEnableSound] = useState(true);

  // 1) init background music (only once)
  useEffect(() => {
    if (!musicRef.current) {
      musicRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      musicRef.current.loop = true; // usually background music should loop
      musicRef.current.volume = (musicOn ? musicVolume : 0) / 100;
    }
  }, []);

  // 2) update background music volume when slider or toggle changes
  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.volume = (musicOn ? musicVolume : 0) / 100;
  }, [musicOn, musicVolume]);

  // 3) play/pause background music when toggled (after first user interaction)
  useEffect(() => {
    if (!musicRef.current || !hasUserInteracted) return;

    if (musicOn && musicVolume > 0) {
      musicRef.current.play().catch((err) => {
        console.warn('Failed to play background music:', err);
      });
    } else {
      musicRef.current.pause();
    }
  }, [musicOn, musicVolume, hasUserInteracted]);

  // 4) first interaction unlock (browser autoplay policy)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        setShowEnableSound(false);
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  // 5) init click sound (only once)
  useEffect(() => {
    if (!clickRef.current) {
      clickRef.current = new Audio(clickSoundFile);
      clickRef.current.volume = clickVolume / 100;
    }
  }, []);

  // 6) update click volume independently
  useEffect(() => {
    if (!clickRef.current) return;
    clickRef.current.volume = clickVolume / 100;
  }, [clickVolume]);

  const playClickSound = () => {
    if (!clickRef.current) return;
    if (!clickSoundOn || clickVolume <= 0) return;

    clickRef.current.currentTime = 0;
    clickRef.current.play().catch(() => {});
  };
  // 7) init win sound (only once)
  useEffect(() => {
    if (!winRef.current) {
      winRef.current = new Audio(winSoundFile);
      winRef.current.volume = clickVolume / 100; // uses Effects volume
    }
  }, []);

  // 8) keep win volume in sync with effects volume
  useEffect(() => {
    if (!winRef.current) return;
    winRef.current.volume = clickVolume / 100;
  }, [clickVolume]);

  const playWinSound = () => {
    if (!winRef.current) return;
    if (!clickSoundOn || clickVolume <= 0) return;

    winRef.current.currentTime = 0;
    winRef.current.play().catch(() => {});
  };
  return (
    <AudioContext.Provider
      value={{
        musicOn,
        setMusicOn,
        musicVolume,
        setMusicVolume,
        clickSoundOn,
        setClickSoundOn,
        clickVolume,
        setClickVolume,
        playClickSound,
        playWinSound,
      }}
    >
      {children}

      {showEnableSound && (
        <button
          onClick={() => {
            setHasUserInteracted(true);
            setShowEnableSound(false);
          }}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 999999,
            background: '#fff',
            color: '#000',
            padding: '8px 12px',
            border: '1px solid #000',
          }}
        >
          Enable Sound
        </button>
      )}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}
