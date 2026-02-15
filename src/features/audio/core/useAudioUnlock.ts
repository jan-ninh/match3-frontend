import { useEffect } from 'react';

import { ensureAudioUnlocked } from './audioContext';

export function useAudioUnlock(): void {
  useEffect(() => {
    ensureAudioUnlocked();
  }, []);
}
