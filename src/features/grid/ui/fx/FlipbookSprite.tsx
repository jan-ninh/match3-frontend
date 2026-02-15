// src/features/grid/ui/fx/FlipbookSprite.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export type FlipbookSheetSpec = {
  sheetUrl: string;

  // sheet grid
  cols: number;
  rows: number;

  // single frame in the sheet (px)
  frameW: number;
  frameH: number;

  // total usable frames (<= cols*rows)
  frameCount: number;
};

export type FlipbookSpriteProps = {
  sheet: FlipbookSheetSpec;

  // playback
  fps: number; // e.g. 30
  loop?: boolean;
  paused?: boolean;

  // If you want to sync with an external clock (e.g. engine event):
  // - Provide startAtMs in the same time-domain as getNowMs (default: Date.now()).
  startAtMs?: number;
  getNowMs?: () => number;

  // visuals
  renderW?: number; // default: sheet.frameW
  renderH?: number; // default: sheet.frameH
  opacity?: number;
  mixBlendMode?: CSSProperties['mixBlendMode']; // e.g. 'screen' / 'lighter'
  filter?: string; // e.g. 'drop-shadow(0 0 10px rgba(255,80,0,0.35))'
  className?: string;
  style?: CSSProperties;

  // lifecycle
  onDone?: () => void;

  // accessibility
  ariaLabel?: string; // default: "animation"
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;

    const onChange = () => setReduced(Boolean(mq.matches));
    onChange();

    // Safari fallback
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }

    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return reduced;
}

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n | 0;
}

/**
 * FlipbookSprite (DOM/CSS)
 * - Renders ONE <div> with background-image + background-position.
 * - Drives frames via requestAnimationFrame.
 *
 * Typical usage:
 * - Put your sheet under e.g. src/assets/fx/explosion_flipbook.png
 * - Import URL via Vite: `import explosionSheetUrl from '@/assets/fx/explosion_flipbook.png'`
 * - Pass sheet spec + fps + onDone (remove overlay when done).
 */
export function FlipbookSprite({
  sheet,
  fps,
  loop = false,
  paused = false,
  startAtMs,
  getNowMs = Date.now,

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
  const prefersReducedMotion = usePrefersReducedMotion();

  const safeCols = clampInt(sheet.cols, 1, 2048);
  const safeRows = clampInt(sheet.rows, 1, 2048);
  const safeFrameW = clampInt(sheet.frameW, 1, 4096);
  const safeFrameH = clampInt(sheet.frameH, 1, 4096);

  const maxFrames = safeCols * safeRows;
  const safeFrameCount = clampInt(sheet.frameCount, 1, maxFrames);

  const safeFps = Math.max(1, Math.min(240, fps));

  const outW = renderW ?? safeFrameW;
  const outH = renderH ?? safeFrameH;

  const scaleX = outW / safeFrameW;
  const scaleY = outH / safeFrameH;

  const [frame, setFrame] = useState<number>(0);
  const frameRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const startedRef = useRef<boolean>(false);
  const internalStartMsRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);

  // keep ref in sync (avoid setState spam in rAF)
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // reset on important spec changes
  useEffect(() => {
    doneRef.current = false;
    startedRef.current = false;
    internalStartMsRef.current = 0;
    setFrame(0);
  }, [sheet.sheetUrl, sheet.cols, sheet.rows, sheet.frameW, sheet.frameH, sheet.frameCount, safeFps, loop, outW, outH]);

  useEffect(() => {
    if (paused) return;

    // reduced motion: jump to end immediately (unless looping)
    if (prefersReducedMotion && !loop) {
      setFrame(safeFrameCount - 1);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }

    const ensureStart = () => {
      if (startedRef.current) return;

      startedRef.current = true;

      if (typeof startAtMs === 'number') {
        internalStartMsRef.current = startAtMs;
        return;
      }

      internalStartMsRef.current = getNowMs();
    };

    ensureStart();

    const tick = () => {
      const startMs = internalStartMsRef.current;
      const tMs = getNowMs() - startMs;

      const raw = Math.floor((tMs * safeFps) / 1000);

      if (loop) {
        const next = raw % safeFrameCount;
        if (frameRef.current !== next) setFrame(next);
        rafIdRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (raw >= safeFrameCount) {
        // lock on final frame, fire onDone once
        if (frameRef.current !== safeFrameCount - 1) setFrame(safeFrameCount - 1);

        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
        return;
      }

      if (frameRef.current !== raw) setFrame(raw);

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);

    return () => {
      const rafId = rafIdRef.current;
      rafIdRef.current = null;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [paused, prefersReducedMotion, loop, safeFrameCount, safeFps, startAtMs, getNowMs, onDone]);

  const sheetW = safeCols * safeFrameW;
  const sheetH = safeRows * safeFrameH;

  const col = frame % safeCols;
  const row = Math.floor(frame / safeCols);

  // scale-aware background positioning
  const bgX = col * safeFrameW * scaleX;
  const bgY = row * safeFrameH * scaleY;

  const bgSizeW = sheetW * scaleX;
  const bgSizeH = sheetH * scaleY;

  const divStyle = useMemo<CSSProperties>(
    () => ({
      width: outW,
      height: outH,
      backgroundImage: `url(${sheet.sheetUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${bgSizeW}px ${bgSizeH}px`,
      backgroundPosition: `${-bgX}px ${-bgY}px`,
      opacity,
      mixBlendMode,
      filter,
      pointerEvents: 'none',
      willChange: 'background-position',
      ...style,
    }),
    [outW, outH, sheet.sheetUrl, bgSizeW, bgSizeH, bgX, bgY, opacity, mixBlendMode, filter, style],
  );

  return <div className={className} style={divStyle} role="img" aria-label={ariaLabel} />;
}
