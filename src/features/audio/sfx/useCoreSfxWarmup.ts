import { useEffect } from 'react';

import { ensureAudioUnlocked } from '../core/audioContext';
import { installCoreSfxWarmupOnFirstGesture, prefetchCoreSfx } from './sfxPlayer';

/**
 * Gameplay warmup:
 * - “mount”: prefetch CORE_SFX (network/cache) as early as possible
 * - “first gesture”: decode CORE_SFX into WebAudio buffers (low latency guarantee)
 */
export function useCoreSfxWarmup(): void {
  useEffect(() => {
    ensureAudioUnlocked();
    installCoreSfxWarmupOnFirstGesture();

    // bonus: start fetching early (works even before AudioContext is running)
    void prefetchCoreSfx();
  }, []);
}
