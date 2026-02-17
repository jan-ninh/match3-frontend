import { createContext, useContext, useEffect, useRef, useState } from 'react';
import clickSoundFile from '@/assets/sound/CLICK.wav';

type AudioContextType = {
  soundOn: boolean;
  setSoundOn: (value: boolean) => void;
  volume: number;
  setVolume: (value: number) => void;
  playClickSound: () => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(70);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showEnableSound, setShowEnableSound] = useState(true);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize background music from URL
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      audioRef.current.loop = false;
      audioRef.current.volume = volume / 100;

      console.log('Audio URL:', audioRef.current.src);
      audioRef.current.addEventListener('error', () => {
        console.warn('Audio element error:', audioRef.current?.error);
      });
    }
  }, []);

  // Play/Pause based on soundOn state
  useEffect(() => {
    if (!audioRef.current || !hasUserInteracted) return;

    if (soundOn) {
      audioRef.current.play().catch((err) => {
        console.warn('Failed to play audio:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [soundOn, hasUserInteracted]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Listen for first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        setSoundOn(true);
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

  // Initialize click sound from assets
  useEffect(() => {
    if (!clickAudioRef.current) {
      clickAudioRef.current = new Audio(clickSoundFile);
      clickAudioRef.current.volume = 0.5;
    }
  }, []);

  const playClickSound = () => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
  };

  return (
    <AudioContext.Provider value={{ soundOn, setSoundOn, volume, setVolume, playClickSound }}>
      {children}
      {showEnableSound && (
        <button
          onClick={() => {
            setHasUserInteracted(true);
            setSoundOn(true);
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
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}

