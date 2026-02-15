// src/features/audio/core/audioContext.ts
export type AudioContextLike = AudioContext;

let ctx: AudioContextLike | null = null;

function getWebkitAudioContextCtor(): (new () => AudioContextLike) | null {
  if (typeof window === 'undefined') return null;

  const w = window as unknown as { webkitAudioContext?: new () => AudioContextLike };
  return typeof w.webkitAudioContext === 'function' ? w.webkitAudioContext : null;
}

export function getAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;

  const Ctor = window.AudioContext ?? getWebkitAudioContextCtor();
  if (!Ctor) return null;

  if (ctx) return ctx;

  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    ctx = null;
    return null;
  }
}

let unlockInstalled = false;

export function ensureAudioUnlocked(): void {
  if (typeof window === 'undefined') return;
  if (unlockInstalled) return;
  unlockInstalled = true;

  const tryResume = () => {
    const c = getAudioContext();
    if (!c) return;

    // In some browsers this throws if not allowed yet; ignore.
    if (c.state === 'running') return;
    void c.resume().catch(() => {});
  };

  const onFirstGesture = () => {
    tryResume();

    // Remove listeners after first attempt (keeps it cheap).
    window.removeEventListener('pointerdown', onFirstGesture, true);
    window.removeEventListener('keydown', onFirstGesture, true);
    window.removeEventListener('touchstart', onFirstGesture, true);
  };

  window.addEventListener('pointerdown', onFirstGesture, true);
  window.addEventListener('keydown', onFirstGesture, true);
  window.addEventListener('touchstart', onFirstGesture, true);
}
