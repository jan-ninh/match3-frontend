import { getAudioContext, onFirstAudioGesture } from '../core/audioContext';
import { CORE_SFX, SFX_SOURCES, type SfxId } from './sfxManifest';

export type PlaySfxOptions = Readonly<{
  volume?: number; // 0..1
  playbackRate?: number; // 0.25..4
}>;

const bufferCache = new Map<SfxId, AudioBuffer>();
const bytesCache = new Map<SfxId, ArrayBuffer>();

// id -> in-flight preload promise (dedupe)
const loadingCache = new Map<SfxId, Promise<boolean>>();

// id -> resolved URL that we know exists (first successful fetch)
const resolvedUrlCache = new Map<SfxId, string>();

const activeHtmlAudio = new Set<HTMLAudioElement>();

let probeAudio: HTMLAudioElement | null = null;

function getProbeAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (probeAudio) return probeAudio;

  try {
    probeAudio = new Audio();
    return probeAudio;
  } catch {
    probeAudio = null;
    return null;
  }
}

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function extOf(url: string): string {
  const q = url.indexOf('?');
  const s = q >= 0 ? url.slice(0, q) : url;
  const dot = s.lastIndexOf('.');
  if (dot < 0) return '';
  return s.slice(dot + 1).toLowerCase();
}

function mimeForExt(ext: string): string {
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'm4a') return 'audio/mp4';
  if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
  return '';
}

function isLikelyPlayable(url: string): boolean {
  const a = getProbeAudio();
  if (!a) return true; // SSR / no probe -> assume playable
  const mime = mimeForExt(extOf(url));
  if (!mime) return true;

  const r = a.canPlayType(mime);
  return r === 'probably' || r === 'maybe';
}

function urlsForId(id: SfxId): readonly string[] {
  return SFX_SOURCES[id];
}

function urlsSortedForFetch(id: SfxId): readonly string[] {
  const urls = urlsForId(id);
  const playable = urls.filter((u) => isLikelyPlayable(u));
  const rest = urls.filter((u) => !isLikelyPlayable(u));
  return [...playable, ...rest];
}

/**
 * For *instant* HTMLAudio playback we bias towards “most likely to exist right now”.
 * - If we already successfully fetched a URL, we use that (true prio).
 * - Otherwise: try the last entry in SFX_SOURCES first (usually mp3), to avoid silence
 *   when only one file is present during setup.
 */
function urlForImmediatePlayback(id: SfxId): string | null {
  const resolved = resolvedUrlCache.get(id);
  if (resolved) return resolved;

  const urls = urlsForId(id);
  if (urls.length === 0) return null;

  // prefer the most compatible fallback until we have a resolved URL
  const last = urls[urls.length - 1] ?? null;
  return last;
}

async function fetchBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function prefetchSfx(id: SfxId): Promise<boolean> {
  if (bytesCache.has(id)) return true;

  const urls = urlsSortedForFetch(id);

  for (const url of urls) {
    const ab = await fetchBytes(url);
    if (!ab) continue;

    bytesCache.set(id, ab);
    resolvedUrlCache.set(id, url);
    return true;
  }

  return false;
}

async function ensureCtxRunning(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state !== 'running') {
    // Might still fail outside user gesture; best-effort.
    await ctx.resume().catch(() => {});
  }

  return ctx;
}

export async function decodeSfx(id: SfxId): Promise<boolean> {
  if (bufferCache.has(id)) return true;

  const ctx = await ensureCtxRunning();
  if (!ctx) return false;

  const hasBytes = bytesCache.has(id) || (await prefetchSfx(id));
  if (!hasBytes) return false;

  const bytes = bytesCache.get(id);
  if (!bytes) return false;

  try {
    // Copy the bytes: some browsers detach the underlying buffer during decode.
    const buf = await ctx.decodeAudioData(bytes.slice(0));
    bufferCache.set(id, buf);
    return true;
  } catch {
    return false;
  }
}

/**
 * Preload = prefetch early (works without an AudioContext) + decode when possible.
 * Return value means “decoded and ready for low-latency WebAudio”.
 */
export async function preloadSfx(id: SfxId): Promise<boolean> {
  if (bufferCache.has(id)) return true;

  const existing = loadingCache.get(id);
  if (existing) return await existing;

  const p = (async () => {
    // Always try to prefetch (so we can resolve the correct URL & warm caches).
    await prefetchSfx(id);

    // If the AudioContext is available/running, decode now.
    return await decodeSfx(id);
  })();

  loadingCache.set(id, p);

  const ok = await p;
  loadingCache.delete(id);
  return ok;
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
    a.removeEventListener('error', cleanup);
  };

  a.addEventListener('ended', cleanup);
  a.addEventListener('pause', cleanup);
  a.addEventListener('error', cleanup);

  void a.play().catch(() => {
    // autoplay blocked / missing file => ignore
    cleanup();
  });
}

/**
 * Play a registered SFX.
 * - If already decoded (AudioBuffer): plays via WebAudio (low latency).
 * - Otherwise: best-effort HTMLAudio fallback and kick off preload for next time.
 */
export function playSfx(id: SfxId, opts?: PlaySfxOptions): void {
  const buf = bufferCache.get(id);
  if (buf) {
    playWithWebAudio(buf, opts);
    return;
  }

  const url = urlForImmediatePlayback(id);
  if (url) playWithHtmlAudio(url, opts);

  // warm up for future plays
  void preloadSfx(id);
}

export async function prefetchCoreSfx(): Promise<void> {
  await Promise.all(CORE_SFX.map((id) => prefetchSfx(id)));
}

export async function decodeCoreSfx(): Promise<void> {
  await Promise.all(CORE_SFX.map((id) => decodeSfx(id)));
}

let coreWarmupInstalled = false;

/**
 * Install a one-time “first gesture” warmup:
 * - after the browser allows audio, decode CORE_SFX so the first “real” hit is not cold.
 */
export function installCoreSfxWarmupOnFirstGesture(): void {
  if (coreWarmupInstalled) return;
  coreWarmupInstalled = true;

  // Note: ensureAudioUnlocked() must be installed somewhere else (e.g. via useCoreSfxWarmup).
  onFirstAudioGesture(() => {
    void decodeCoreSfx();
  });
}
