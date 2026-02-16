// src/features/audio/core/audioContext.ts
export type AudioContextLike = AudioContext;

let ctx: AudioContextLike | null = null;

function getWebkitAudioContextCtor(): (new () => AudioContextLike) | null {
  if (typeof window === 'undefined') return null;

  const w = window as unknown as { webkitAudioContext?: new () => AudioContextLike };
  return typeof w.webkitAudioContext === 'function' ? w.webkitAudioContext : null;
}

function isRunning(c: AudioContextLike): boolean {
  return c.state === 'running';
}

export function getAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;

  // Some browsers may end up with a closed context after long idle / OS suspend.
  // A closed context can't be resumed; recreate it on demand.
  if (ctx && ctx.state === 'closed') ctx = null;

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

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    window.setTimeout(resolve, ms);
  });
}

let lastPrimeAtMs = 0;

/**
 * "Prime" the output so the first real SFX after resume isn't cold.
 * Best-effort + throttled.
 */
function primeAudioOutputOn(c: AudioContextLike): void {
  if (typeof window === 'undefined') return;
  if (!isRunning(c)) return;

  const t = nowMs();
  if (t - lastPrimeAtMs < 250) return;
  lastPrimeAtMs = t;

  try {
    // A tiny (inaudible) render to wake up the audio output path more reliably than a 1-sample buffer.
    const primeMs = 30;
    const frames = Math.max(1, Math.ceil((c.sampleRate * primeMs) / 1000));
    const buf = c.createBuffer(1, frames, c.sampleRate);

    const src = c.createBufferSource();
    src.buffer = buf;

    const gain = c.createGain();
    // Do not use exactly 0 (some impls may optimize the node graph away).
    gain.gain.value = 0.00001;

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

    const startAt = c.currentTime + 0.001;
    const stopAt = startAt + frames / c.sampleRate;

    src.start(startAt);
    src.stop(stopAt);
  } catch {
    // ignore
  }
}

export function primeAudioOutput(): void {
  if (typeof window === 'undefined') return;

  const c = getAudioContext();
  if (!c) return;

  primeAudioOutputOn(c);
}

export function resumeAudioContextIfNeeded(): void {
  if (typeof window === 'undefined') return;

  const c = getAudioContext();
  if (!c) return;

  if (isRunning(c)) return;
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

// If we detect "coming back" while audio is still suspended, we prime on next gesture.
// (visibility/focus events alone are not always a valid resume gesture across browsers.)
let needsPrimeOnNextGesture = false;
let lastResumeAttemptAtMs = 0;

async function resumePrimeNotifyFromGesture(): Promise<void> {
  if (typeof window === 'undefined') return;

  const c = getAudioContext();
  if (!c) return;

  const t = nowMs();
  if (t - lastResumeAttemptAtMs < 50) return;
  lastResumeAttemptAtMs = t;

  if (!isRunning(c)) {
    try {
      // Calling resume() synchronously within the gesture handler is important in many browsers.
      const p = c.resume();
      await p;
    } catch {
      // ignore
    }

    // Some browsers update `state` asynchronously after resume resolves; give it a few ticks.
    for (let i = 0; i < 3 && !isRunning(c); i++) {
      await delayMs(0);
    }
  }

  if (!isRunning(c)) {
    // Still blocked; don't claim "unlocked".
    needsPrimeOnNextGesture = true;
    return;
  }

  primeAudioOutputOn(c);
  needsPrimeOnNextGesture = false;
  notifyUnlockSubscribers();
}

/**
 * Installs low-level "resume hooks" once:
 * - gesture capture (pointerdown/keydown/touchstart): earliest resume before UI handlers
 * - focus/pageshow/visibilitychange: best-effort resume; prime is guaranteed on next gesture
 */
export function ensureAudioUnlocked(): void {
  if (typeof window === 'undefined') return;
  if (unlockInstalled) return;
  unlockInstalled = true;

  const onUserGesture = () => {
    void resumePrimeNotifyFromGesture();
  };

  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    const c = getAudioContext();
    if (!c) return;

    if (isRunning(c)) {
      // If output got cold while tab was hidden, prime immediately (no gesture needed).
      primeAudioOutputOn(c);
      needsPrimeOnNextGesture = false;
      return;
    }

    // In many browsers, these events are not a valid "unlock gesture".
    // Mark it and prime on the next real user input.
    needsPrimeOnNextGesture = true;

    try {
      const p = c.resume();
      void p
        .then(() => {
          if (!isRunning(c)) return;
          primeAudioOutputOn(c);
          needsPrimeOnNextGesture = false;
        })
        .catch(() => {});
    } catch {
      // ignore
    }
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

  // If we flagged "needs prime", the very next gesture will handle it anyway,
  // but we can opportunistically prime if context becomes running in the meantime.
  if (needsPrimeOnNextGesture) {
    void resumePrimeNotifyFromGesture();
  }
}
