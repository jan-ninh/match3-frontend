// src\features\audio\core\audioContext.ts
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

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

let lastPrimeAtMs = 0;

/**
 * "Prime" the output so the first real SFX after resume isn't cold.
 * Best-effort + throttled.
 */
export function primeAudioOutput(): void {
  if (typeof window === 'undefined') return;

  const c = getAudioContext();
  if (!c) return;
  if (c.state !== 'running') return;

  const t = nowMs();
  if (t - lastPrimeAtMs < 250) return;
  lastPrimeAtMs = t;

  try {
    const buf = c.createBuffer(1, 1, c.sampleRate);

    const src = c.createBufferSource();
    src.buffer = buf;

    const gain = c.createGain();
    gain.gain.value = 0;

    src.connect(gain);
    gain.connect(c.destination);

    src.onended = () => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };

    src.start(c.currentTime);
    src.stop(c.currentTime + 0.01);
  } catch {
    // ignore
  }
}

export function resumeAudioContextIfNeeded(): void {
  if (typeof window === 'undefined') return;

  const c = getAudioContext();
  if (!c) return;

  if (c.state === 'running') return;
  void c.resume().catch(() => {});
}

type AudioUnlockSubscriber = () => void;

const unlockSubscribers = new Set<AudioUnlockSubscriber>();

export function addAudioUnlockSubscriber(fn: AudioUnlockSubscriber): () => void {
  unlockSubscribers.add(fn);
  return () => unlockSubscribers.delete(fn);
}

function notifyUnlockSubscribers(): void {
  for (const fn of unlockSubscribers) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

let unlockInstalled = false;

/**
 * Installs low-level "resume hooks" once:
 * - gesture capture (pointerdown/keydown/touchstart): earliest resume before UI handlers
 * - focus/pageshow/visibilitychange: resume+prime when user returns from AFK/tab switch
 */
export function ensureAudioUnlocked(): void {
  if (typeof window === 'undefined') return;
  if (unlockInstalled) return;
  unlockInstalled = true;

  const resumePrimeNotifySoon = () => {
    resumeAudioContextIfNeeded();

    // Resume is async in many browsers; prime after the current tick.
    window.setTimeout(() => {
      primeAudioOutput();
    }, 0);

    notifyUnlockSubscribers();
  };

  const onUserGesture = () => {
    resumePrimeNotifySoon();
  };

  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    resumePrimeNotifySoon();
  };

  // Capture-phase is important: this runs before React handlers that may call playSfx().
  window.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true });
  window.addEventListener('touchstart', onUserGesture, { capture: true, passive: true });
  window.addEventListener('keydown', onUserGesture, { capture: true });

  // Coming back from tab switch / AFK.
  window.addEventListener('focus', onVisible, { capture: true });
  window.addEventListener('pageshow', onVisible, { capture: true });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisible, { capture: true });
  }
}
