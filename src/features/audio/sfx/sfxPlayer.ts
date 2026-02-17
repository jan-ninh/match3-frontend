// src/features/audio/sfx/sfxPlayer.ts
import { addAudioUnlockSubscriber, ensureAudioUnlocked, getAudioContext, primeAudioOutput, resumeAudioContextIfNeeded } from '../core/audioContext';
import { CORE_SFX, SFX_URLS, type SfxId } from './sfxManifest';

// Ensure the unlock capture listeners are installed as early as possible.
// This matters because many SFX are triggered *after* the initial click (e.g. engine ACK in an effect),
// so the AudioContext must already have been resumed during the gesture.
ensureAudioUnlocked();

export type PlaySfxOptions = Readonly<{
  volume?: number; // 0..1
  playbackRate?: number; // 0.25..4
}>;

type CachedBuffer = Readonly<{
  buf: AudioBuffer;
  url: string;
}>;

const bufferCache = new Map<SfxId, CachedBuffer>();
const chosenUrlCache = new Map<SfxId, string>();
const loadingCache = new Map<SfxId, Promise<CachedBuffer | null>>();

const activeHtmlAudio = new Set<HTMLAudioElement>();

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function urlsForId(id: SfxId): readonly string[] {
  const urls = SFX_URLS[id];
  return Array.isArray(urls) ? urls : [];
}

async function tryFetchDecode(url: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const ab = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    return buf;
  } catch {
    return null;
  }
}

async function loadBuffer(id: SfxId): Promise<CachedBuffer | null> {
  const urls = urlsForId(id);
  if (urls.length === 0) return null;

  for (const url of urls) {
    const buf = await tryFetchDecode(url);
    if (!buf) continue;

    const rec: CachedBuffer = { buf, url };
    bufferCache.set(id, rec);
    chosenUrlCache.set(id, url);
    return rec;
  }

  return null;
}

export async function preloadSfx(id: SfxId): Promise<boolean> {
  ensureAudioUnlocked();

  if (bufferCache.has(id)) return true;

  const existing = loadingCache.get(id);
  if (existing) {
    const rec = await existing;
    return !!rec;
  }

  const p = loadBuffer(id);
  loadingCache.set(id, p);

  const rec = await p;
  loadingCache.delete(id);
  return !!rec;
}

function playWithWebAudio(buf: AudioBuffer, opts: PlaySfxOptions | undefined): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Best-effort: if unlocked already, this is a no-op; otherwise capture listeners will handle the next gesture.
  ensureAudioUnlocked();
  resumeAudioContextIfNeeded();
  primeAudioOutput();

  const vol = clampNum(opts?.volume ?? 1, 0, 1);
  const rate = clampNum(opts?.playbackRate ?? 1, 0.25, 4);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;

  const gain = ctx.createGain();
  gain.gain.value = vol;

  src.connect(gain);
  gain.connect(ctx.destination);

  try {
    // Starting slightly in the future avoids edge cases where resume/prime happens in the same tick.
    src.start(ctx.currentTime + 0.005);
  } catch {
    // ignore
  }

  src.onended = () => {
    try {
      src.disconnect();
      gain.disconnect();
    } catch {
      // ignore
    }
  };
}

function scoreCanPlay(val: string): number {
  if (val === 'probably') return 2;
  if (val === 'maybe') return 1;
  return 0;
}

function guessMime(url: string): string | null {
  const u = url.toLowerCase();
  if (u.endsWith('.mp3')) return 'audio/mpeg';
  if (u.endsWith('.ogg')) return 'audio/ogg; codecs="vorbis"';
  if (u.endsWith('.m4a') || u.endsWith('.mp4')) return 'audio/mp4; codecs="mp4a.40.2"';
  if (u.endsWith('.wav')) return 'audio/wav';
  return null;
}

function orderUrlsForHtmlAudio(urls: readonly string[]): readonly string[] {
  if (typeof document === 'undefined') return urls;

  const probe = document.createElement('audio');

  const scored = urls.map((u) => {
    const mime = guessMime(u);
    const score = mime ? scoreCanPlay(probe.canPlayType(mime)) : 0;
    return { u, score };
  });

  // Keep original priority, but prefer "supported" when available.
  const bestScore = scored.reduce((m, r) => (r.score > m ? r.score : m), 0);
  if (bestScore === 0) return urls;

  const supported = scored.filter((r) => r.score === bestScore).map((r) => r.u);
  const unsupported = scored.filter((r) => r.score !== bestScore).map((r) => r.u);
  return [...supported, ...unsupported];
}

function playWithHtmlAudio(urls: readonly string[], opts: PlaySfxOptions | undefined): void {
  if (typeof window === 'undefined') return;
  if (urls.length === 0) return;

  ensureAudioUnlocked();

  const vol = clampNum(opts?.volume ?? 1, 0, 1);
  const rate = clampNum(opts?.playbackRate ?? 1, 0.25, 4);

  const ordered = orderUrlsForHtmlAudio(urls);

  const a = new Audio();
  a.preload = 'auto';
  a.volume = vol;
  a.playbackRate = rate;

  activeHtmlAudio.add(a);

  const cleanup = () => {
    activeHtmlAudio.delete(a);
    a.removeEventListener('ended', cleanup);
    a.removeEventListener('pause', cleanup);
    a.removeEventListener('error', cleanup);
  };

  a.addEventListener('ended', cleanup);
  a.addEventListener('pause', cleanup);
  a.addEventListener('error', cleanup);

  let i = 0;

  const tryNext = () => {
    if (i >= ordered.length) {
      cleanup();
      return;
    }

    const url = ordered[i];
    i += 1;

    a.src = url;

    void a.play().catch(() => {
      // unsupported format / 404 / autoplay blocked -> try next
      tryNext();
    });
  };

  tryNext();
}

/**
 * Play a registered SFX.
 * - If already preloaded (AudioBuffer): plays via WebAudio (low latency).
 * - Otherwise: falls back to HTMLAudio *and* kicks off a preload for next time.
 */
export function playSfx(id: SfxId, opts?: PlaySfxOptions): void {
  ensureAudioUnlocked();

  const cached = bufferCache.get(id);
  if (cached) {
    playWithWebAudio(cached.buf, opts);
    return;
  }

  const urls = urlsForId(id);
  if (urls.length === 0) return;

  // If we already know which url decodes (from an earlier preload), prefer that first.
  const preferred = chosenUrlCache.get(id);
  const ordered = preferred ? [preferred, ...urls.filter((u) => u !== preferred)] : urls;

  // no buffer yet -> immediate fallback
  playWithHtmlAudio(ordered, opts);

  // warm up for future plays
  void preloadSfx(id);
}

/**
 * Prefetch CORE_SFX audio files (network/cache only, no WebAudio decode).
 * Safe before user gestures / AudioContext resume policies.
 */
type Prefetched = Readonly<{ ab: ArrayBuffer; url: string }>;

const prefetchCache = new Map<SfxId, Prefetched>();
const prefetchLoadingCache = new Map<SfxId, Promise<Prefetched | null>>();

async function tryFetchArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function prefetchSfx(id: SfxId): Promise<Prefetched | null> {
  const cached = prefetchCache.get(id);
  if (cached) return cached;

  const inflight = prefetchLoadingCache.get(id);
  if (inflight) return await inflight;

  const p = (async (): Promise<Prefetched | null> => {
    const urls = urlsForId(id);
    if (urls.length === 0) return null;

    for (const url of urls) {
      const ab = await tryFetchArrayBuffer(url);
      if (!ab) continue;

      const rec: Prefetched = { ab, url };
      prefetchCache.set(id, rec);

      // Helps playSfx() prefer the first successfully fetched url.
      chosenUrlCache.set(id, url);

      return rec;
    }

    return null;
  })();

  prefetchLoadingCache.set(id, p);

  const rec = await p;
  prefetchLoadingCache.delete(id);
  return rec;
}

export async function prefetchCoreSfx(): Promise<void> {
  await Promise.all(CORE_SFX.map((id) => prefetchSfx(id)));
}

async function warmupCoreSfx(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  ensureAudioUnlocked();
  resumeAudioContextIfNeeded();
  primeAudioOutput();

  await Promise.all(
    CORE_SFX.map(async (id) => {
      if (bufferCache.has(id)) return;

      // Prefer prefetched ArrayBuffer (no extra network).
      const pref = prefetchCache.get(id) ?? (await prefetchSfx(id));
      if (!pref) {
        void preloadSfx(id);
        return;
      }

      try {
        // decodeAudioData may detach the ArrayBuffer → keep cache stable.
        const ab = pref.ab.slice(0);
        const buf = await ctx.decodeAudioData(ab);

        const rec: CachedBuffer = { buf, url: pref.url };
        bufferCache.set(id, rec);
        chosenUrlCache.set(id, pref.url);

        // free memory (we no longer need the ArrayBuffer once decoded)
        prefetchCache.delete(id);
      } catch {
        // Fallback: normal preload path (fetch+decode).
        void preloadSfx(id);
      }
    }),
  );
}

let coreWarmupInstalled = false;

/**
 * One-shot warmup:
 * - Waits for the first successful "audio unlock" (gesture/focus/visibility resume),
 * - then decodes CORE_SFX into WebAudio buffers (low latency guarantee).
 *
 * Uses the central unlock mechanism (no extra DOM listeners).
 */
export function installCoreSfxWarmupOnFirstGesture(): void {
  if (typeof window === 'undefined') return;
  if (coreWarmupInstalled) return;
  coreWarmupInstalled = true;

  ensureAudioUnlocked();

  let ran = false;
  let unsub: (() => void) | null = null;

  const runOnce = () => {
    if (ran) return;
    ran = true;

    if (unsub) {
      const u = unsub;
      unsub = null;
      u();
    }

    void warmupCoreSfx();
  };

  unsub = addAudioUnlockSubscriber(runOnce);

  const c = getAudioContext();
  if (c && c.state === 'running') runOnce();
}
