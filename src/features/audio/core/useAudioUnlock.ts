import { useEffect, useMemo, useState } from 'react';

import { addAudioUnlockSubscriber, ensureAudioUnlocked } from './audioContext';
import { CORE_SFX } from '../sfx/sfxManifest';
import { preloadSfx } from '../sfx/sfxPlayer';
import { useAudioKeepalive } from './useAudioKeepalive';

const LS_KEY_AUDIO_KEEPALIVE = 'match3.audio.keepalive';

function readAudioKeepaliveFromStorage(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(LS_KEY_AUDIO_KEEPALIVE) === '1';
  } catch {
    return false;
  }
}

function writeAudioKeepaliveToStorage(enabled: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LS_KEY_AUDIO_KEEPALIVE, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function useAudioUnlock(): void {
  const initialKeepalive = useMemo(() => readAudioKeepaliveFromStorage(), []);
  const [keepaliveEnabled, setKeepaliveEnabled] = useState(initialKeepalive);

  // (3) optional keepalive (feature-flag via localStorage).
  useAudioKeepalive({ enabled: keepaliveEnabled });

  // (2) gesture policy hook: installs capture listeners + resume/prime (+ focus/visibility resume).
  useEffect(() => {
    ensureAudioUnlocked();
  }, []);

  // (1) gameplay mount bonus warmup + (2) guarantee warmup on first gesture/return.
  useEffect(() => {
    for (const id of CORE_SFX) void preloadSfx(id);

    const unsub = addAudioUnlockSubscriber(() => {
      for (const id of CORE_SFX) void preloadSfx(id);
    });

    return () => unsub();
  }, []);

  // DEV helper: toggle keepalive with "K" (writes localStorage).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'k' && e.key !== 'K') return;

      const tag = (e.target instanceof Element ? e.target.tagName : '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      e.preventDefault();

      setKeepaliveEnabled((prev) => {
        const next = !prev;
        writeAudioKeepaliveToStorage(next);
        return next;
      });
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as AddEventListenerOptions);
  }, []);
}
