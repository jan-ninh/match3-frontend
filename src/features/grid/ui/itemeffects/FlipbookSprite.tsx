// src/features/grid/ui/itemeffects/FlipbookSprite.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
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
   * If omitted, Date.now() is used.
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

/**
 * FlipbookSprite (DOM/CSS background-position).
 * - 1 div, 1 spritesheet, background-position moves per frame.
 * - Driven by requestAnimationFrame.
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

  const [frame, setFrame] = useState<number>(0);

  const frameRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef<boolean>(false);
  const startMsRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // Reset when the sheet or timing changes
  useEffect(() => {
    doneRef.current = false;
    startedRef.current = false;
    startMsRef.current = 0;
    setFrame(0);
  }, [sheet.sheetUrl, sheet.cols, sheet.rows, sheet.frameW, sheet.frameH, sheet.frameCount, safeFps, loop, outW, outH]);

  useEffect(() => {
    if (paused) return;
    if (typeof window === 'undefined') return;

    const ensureStart = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      if (typeof startAtMs === 'number' && Number.isFinite(startAtMs)) {
        startMsRef.current = startAtMs;
        return;
      }

      startMsRef.current = getNowMs();
    };

    ensureStart();

    const tick = () => {
      const tMs = getNowMs() - startMsRef.current;
      const raw = Math.floor((tMs * safeFps) / 1000);

      if (loop) {
        const next = raw % safeFrameCount;
        if (frameRef.current !== next) setFrame(next);
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (raw >= safeFrameCount) {
        if (frameRef.current !== safeFrameCount - 1) setFrame(safeFrameCount - 1);

        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
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
  }, [paused, loop, safeFrameCount, safeFps, startAtMs, getNowMs, onDone]);

  const sheetW = safeCols * safeFrameW;
  const sheetH = safeRows * safeFrameH;

  const col = frame % safeCols;
  const row = Math.floor(frame / safeCols);

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
