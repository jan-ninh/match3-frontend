// src/context/AudioContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import clickSoundFile from '@/assets/sound/CLICK.wav';
import winSoundFile from '@/assets/sound/win.wav';
import loseSoundFile from '@/assets/sound/lose.wav'; // ✅ NEW

type AudioContextType = {
  // Background Music
  musicOn: boolean;
  setMusicOn: (value: boolean) => void;
  musicVolume: number;
  setMusicVolume: (value: number) => void;

  // Effects
  clickSoundOn: boolean;
  setClickSoundOn: (value: boolean) => void;
  clickVolume: number;
  setClickVolume: (value: number) => void;

  playClickSound: () => void;
  playWinSound: () => void;
  playLoseSound: () => void; // ✅ NEW
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const clickRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const loseRef = useRef<HTMLAudioElement | null>(null); // ✅ NEW

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
      musicRef.current.loop = true;
      musicRef.current.volume = (musicOn ? musicVolume : 0) / 100;
    }
  }, []);

  // 2) update background music volume
  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.volume = (musicOn ? musicVolume : 0) / 100;
  }, [musicOn, musicVolume]);

  // 3) play/pause background music after first interaction
  useEffect(() => {
    if (!musicRef.current || !hasUserInteracted) return;

    if (musicOn && musicVolume > 0) {
      musicRef.current.play().catch((err) => console.warn('Failed to play background music:', err));
    } else {
      musicRef.current.pause();
    }
  }, [musicOn, musicVolume, hasUserInteracted]);

  // 4) first interaction unlock
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

  // 5) init click sound
  useEffect(() => {
    if (!clickRef.current) {
      clickRef.current = new Audio(clickSoundFile);
      clickRef.current.volume = clickVolume / 100;
    }
  }, []);

  // 6) init win sound
  useEffect(() => {
    if (!winRef.current) {
      winRef.current = new Audio(winSoundFile);
      winRef.current.volume = clickVolume / 100;
    }
  }, []);

  // 7) init lose sound ✅ NEW
  useEffect(() => {
    if (!loseRef.current) {
      loseRef.current = new Audio(loseSoundFile);
      loseRef.current.volume = clickVolume / 100;
    }
  }, []);

  // 8) keep all effects volumes in sync
  useEffect(() => {
    if (clickRef.current) clickRef.current.volume = clickVolume / 100;
    if (winRef.current) winRef.current.volume = clickVolume / 100;
    if (loseRef.current) loseRef.current.volume = clickVolume / 100;
  }, [clickVolume]);

  const playClickSound = () => {
    if (!clickRef.current) return;
    if (!clickSoundOn || clickVolume <= 0) return;
    clickRef.current.currentTime = 0;
    clickRef.current.play().catch(() => {});
  };

  const playWinSound = () => {
    if (!winRef.current) return;
    if (!clickSoundOn || clickVolume <= 0) return;
    winRef.current.currentTime = 0;
    winRef.current.play().catch(() => {});
  };

  const playLoseSound = () => {
    if (!loseRef.current) return;
    if (!clickSoundOn || clickVolume <= 0) return;
    loseRef.current.currentTime = 0;
    loseRef.current.play().catch(() => {});
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
        playLoseSound,
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
          }}
        ></button>
      )}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}
