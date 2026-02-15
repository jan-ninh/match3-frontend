// src/features/audio/sfx/sfxPlayer.ts
import { getAudioContext } from '../core/audioContext';
import { SFX_URLS, type SfxId } from './sfxManifest';

export type PlaySfxOptions = Readonly<{
  volume?: number; // 0..1
  playbackRate?: number; // 0.25..4
}>;

const bufferCache = new Map<SfxId, AudioBuffer>();
const loadingCache = new Map<SfxId, Promise<AudioBuffer | null>>();

const activeHtmlAudio = new Set<HTMLAudioElement>();

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

async function loadBuffer(id: SfxId): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const url = SFX_URLS[id];
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const ab = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    bufferCache.set(id, buf);
    return buf;
  } catch {
    return null;
  }
}

export async function preloadSfx(id: SfxId): Promise<boolean> {
  if (bufferCache.has(id)) return true;

  const existing = loadingCache.get(id);
  if (existing) {
    const buf = await existing;
    return !!buf;
  }

  const p = loadBuffer(id);
  loadingCache.set(id, p);

  const buf = await p;
  loadingCache.delete(id);
  return !!buf;
}

function playWithWebAudio(buf: AudioBuffer, opts: PlaySfxOptions | undefined): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // try to resume in case it was suspended; ignore errors
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});

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
    src.start(ctx.currentTime);
  } catch {
    // ignore
  }

  src.addEventListener('ended', () => {
    try {
      src.disconnect();
      gain.disconnect();
    } catch {
      // ignore
    }
  });
}

function playWithHtmlAudio(url: string, opts: PlaySfxOptions | undefined): void {
  if (typeof window === 'undefined') return;

  const vol = clampNum(opts?.volume ?? 1, 0, 1);
  const rate = clampNum(opts?.playbackRate ?? 1, 0.25, 4);

  const a = new Audio(url);
  a.preload = 'auto';
  a.volume = vol;
  a.playbackRate = rate;

  activeHtmlAudio.add(a);

  const cleanup = () => {
    activeHtmlAudio.delete(a);
    a.removeEventListener('ended', cleanup);
    a.removeEventListener('pause', cleanup);
  };

  a.addEventListener('ended', cleanup);
  a.addEventListener('pause', cleanup);

  void a.play().catch(() => {
    // autoplay blocked / missing file => ignore
    cleanup();
  });
}

/**
 * Play a registered SFX.
 * - If already preloaded (AudioBuffer): plays via WebAudio (low latency).
 * - Otherwise: falls back to HTMLAudio *and* kicks off a preload for next time.
 */
export function playSfx(id: SfxId, opts?: PlaySfxOptions): void {
  const url = SFX_URLS[id];
  if (!url) return;

  const buf = bufferCache.get(id);
  if (buf) {
    playWithWebAudio(buf, opts);
    return;
  }

  // no buffer yet -> immediate fallback (won't break builds if file missing)
  playWithHtmlAudio(url, opts);

  // warm up for future plays
  void preloadSfx(id);
}
