// src\features\grid\ui\fx\FlipbookSprite.tsx
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';

export type FlipbookSheetSpec = Readonly<{
  sheetUrl: string;

  // grid layout in the sheet
  cols: number;
  rows: number;

  // single frame size in the sheet (px)
  frameW: number;
  frameH: number;

  // number of frames to play (<= cols*rows)
  frameCount: number;
}>;

export type FlipbookSpriteProps = Readonly<{
  sheet: FlipbookSheetSpec;

  // playback
  fps: number;
  loop?: boolean;
  paused?: boolean;

  /**
   * Time base control (recommended: performance.now()).
   * If omitted, performance.now() is used (fallback Date.now()).
   */
  startAtMs?: number;
  getNowMs?: () => number;

  // rendering size (px). Defaults to frameW/frameH.
  renderW?: number;
  renderH?: number;

  // visuals
  opacity?: number;
  mixBlendMode?: CSSProperties['mixBlendMode'];
  filter?: string;

  className?: string;
  style?: CSSProperties;

  // lifecycle
  onDone?: () => void;

  // accessibility
  ariaLabel?: string;
}>;

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const x = n | 0;
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function positiveMod(n: number, mod: number): number {
  const m = n % mod;
  return m < 0 ? m + mod : m;
}

/**
 * FlipbookSprite (DOM/CSS background-position).
 * - 1 div, 1 spritesheet, background-position moves per frame.
 * - Driven by requestAnimationFrame.
 *
 * Perf note:
 * - backgroundPosition is updated imperatively (no React re-render per frame).
 */
export function FlipbookSprite({
  sheet,
  fps,
  loop = false,
  paused = false,

  startAtMs,
  getNowMs,

  renderW,
  renderH,

  opacity = 1,
  mixBlendMode,
  filter,

  className,
  style,

  onDone,
  ariaLabel = 'animation',
}: FlipbookSpriteProps) {
  const defaultNowFn = useMemo(
    () => () => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
      return Date.now();
    },
    [],
  );
  const nowFn = getNowMs ?? defaultNowFn;

  const safeCols = clampInt(sheet.cols, 1, 2048);
  const safeRows = clampInt(sheet.rows, 1, 2048);
  const safeFrameW = clampInt(sheet.frameW, 1, 4096);
  const safeFrameH = clampInt(sheet.frameH, 1, 4096);

  const maxFrames = safeCols * safeRows;
  const safeFrameCount = clampInt(sheet.frameCount, 1, maxFrames);

  const safeFps = clampNum(fps, 1, 240);

  const outW = clampInt(renderW ?? safeFrameW, 1, 8192);
  const outH = clampInt(renderH ?? safeFrameH, 1, 8192);

  const scaleX = outW / safeFrameW;
  const scaleY = outH / safeFrameH;

  const elRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const startedRef = useRef<boolean>(false);
  const startMsRef = useRef<number>(0);
  const pausedAtMsRef = useRef<number | null>(null);
  const doneRef = useRef<boolean>(false);
  const frameRef = useRef<number>(0);

  const sheetW = safeCols * safeFrameW;
  const sheetH = safeRows * safeFrameH;

  const bgSizeW = sheetW * scaleX;
  const bgSizeH = sheetH * scaleY;

  // Reset when the sheet or timing changes
  useEffect(() => {
    doneRef.current = false;
    startedRef.current = false;
    startMsRef.current = 0;
    pausedAtMsRef.current = null;
    frameRef.current = 0;

    const el = elRef.current;
    if (el) el.style.backgroundPosition = '0px 0px';
  }, [sheet.sheetUrl, sheet.cols, sheet.rows, sheet.frameW, sheet.frameH, sheet.frameCount, safeFps, loop, outW, outH]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setFrame = (nextFrame: number) => {
      const el = elRef.current;
      if (!el) return;

      const col = nextFrame % safeCols;
      const row = Math.floor(nextFrame / safeCols);

      const bgX = col * safeFrameW * scaleX;
      const bgY = row * safeFrameH * scaleY;

      el.style.backgroundPosition = `${-bgX}px ${-bgY}px`;
      frameRef.current = nextFrame;
    };

    // Pause: freeze by shifting the start time when resuming.
    if (paused) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pausedAtMsRef.current === null) pausedAtMsRef.current = nowFn();
      return;
    }

    // Resume: shift start time by paused duration.
    if (pausedAtMsRef.current !== null) {
      const resumeAt = nowFn();
      const pausedFor = resumeAt - pausedAtMsRef.current;
      startMsRef.current += pausedFor;
      pausedAtMsRef.current = null;
    }

    const ensureStart = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      if (typeof startAtMs === 'number' && Number.isFinite(startAtMs)) {
        startMsRef.current = startAtMs;
        return;
      }

      startMsRef.current = nowFn();
    };

    ensureStart();

    const tick = () => {
      const tMs = Math.max(0, nowFn() - startMsRef.current);
      const raw = Math.floor((tMs * safeFps) / 1000);

      if (loop) {
        const next = positiveMod(raw, safeFrameCount);
        if (frameRef.current !== next) setFrame(next);
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (raw >= safeFrameCount) {
        const last = safeFrameCount - 1;
        if (frameRef.current !== last) setFrame(last);

        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }

        rafRef.current = null;
        return;
      }

      if (frameRef.current !== raw) setFrame(raw);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      const id = rafRef.current;
      rafRef.current = null;
      if (id !== null) window.cancelAnimationFrame(id);
    };
  }, [paused, loop, safeFrameCount, safeFps, startAtMs, nowFn, onDone, safeCols, safeFrameW, safeFrameH, scaleX, scaleY]);

  const divStyle = useMemo<CSSProperties>(
    () => ({
      width: outW,
      height: outH,
      backgroundImage: `url(${sheet.sheetUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${bgSizeW}px ${bgSizeH}px`,
      backgroundPosition: '0px 0px',
      opacity,
      mixBlendMode,
      filter,
      pointerEvents: 'none',
      willChange: 'background-position',
      ...style,
    }),
    [outW, outH, sheet.sheetUrl, bgSizeW, bgSizeH, opacity, mixBlendMode, filter, style],
  );

  return <div ref={elRef} className={className} style={divStyle} role="img" aria-label={ariaLabel} />;
}
