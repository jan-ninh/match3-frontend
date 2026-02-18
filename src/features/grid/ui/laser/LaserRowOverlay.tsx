import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export type LaserRowOverlayProps = Readonly<{
  armed: boolean;
  row: number | null;
  height: number;
  zIndex?: number;
}>;

type FadePhase = 'hidden' | 'shown' | 'fading';

const FADE_DELAY_MS = 200;
const FADE_OUT_MS = 1200;

export function LaserRowOverlay({ armed, row, height, zIndex = 0 }: LaserRowOverlayProps) {
  if (!armed) return null;

  const lastRowRef = useRef<number | null>(null);
  const fadeStartTimerRef = useRef<number | null>(null);
  const fadeEndTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<FadePhase>('hidden');

  // Persist last hovered row so we can freeze + fade when leaving the grid.
  if (row != null) lastRowRef.current = row;

  useEffect(() => {
    if (typeof window === 'undefined') {
      // Non-DOM environment (SSR/tests): render without timers.
      if (row != null) {
        setPhase('shown');
      } else {
        setPhase('hidden');
      }
      return;
    }

    const clearTimers = () => {
      if (fadeStartTimerRef.current != null) {
        window.clearTimeout(fadeStartTimerRef.current);
        fadeStartTimerRef.current = null;
      }
      if (fadeEndTimerRef.current != null) {
        window.clearTimeout(fadeEndTimerRef.current);
        fadeEndTimerRef.current = null;
      }
    };

    if (!armed) {
      clearTimers();
      lastRowRef.current = null;
      setPhase('hidden');
      return;
    }

    if (row != null) {
      clearTimers();
      setPhase('shown');
      return;
    }

    // row == null: pointer left the board (or outside capture) => freeze lastRow + delayed slow fade
    if (lastRowRef.current == null) {
      clearTimers();
      setPhase('hidden');
      return;
    }

    clearTimers();
    setPhase('shown');

    fadeStartTimerRef.current = window.setTimeout(() => {
      setPhase('fading');
    }, FADE_DELAY_MS);

    fadeEndTimerRef.current = window.setTimeout(() => {
      lastRowRef.current = null;
      setPhase('hidden');
    }, FADE_DELAY_MS + FADE_OUT_MS);

    return () => clearTimers();
  }, [armed, row]);

  const rowH = height > 0 ? 100 / height : 0;

  const effectiveRow = row != null ? row : phase === 'hidden' ? null : lastRowRef.current;
  const top = effectiveRow != null && height > 0 ? (effectiveRow / height) * 100 : null;

  const rootStyle: CSSProperties = { zIndex };

  const rowStyle: CSSProperties =
    top == null
      ? {}
      : {
          top: `${top}%`,
          height: `${rowH}%`,
        };

  const showRow = top != null && phase !== 'hidden';

  const rowOpacityClass = phase === 'fading' ? 'opacity-0' : 'opacity-100';

  // Inline SVG turbulence gives a subtle, "gassy"/noisy shimmer without needing global CSS keyframes.
  const filterId = 'match3-laser-row-gas';
  const gradientId = 'match3-laser-row-grad';

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={rootStyle}>
      {/* Mode hint: subtle board tint */}
      <div className="absolute inset-0 bg-rose-500/5" />

      {/* Keep the pulsing outline ALWAYS visible while armed (even when hovering a row). */}
      <div className="absolute inset-0 rounded-md border-2 border-rose-400/30 animate-pulse" />

      {/* Hovered row highlight. On leave: freeze last row, delay, then slow fade-out. */}
      {showRow ? (
        <div
          className={[
            'absolute left-0 right-0 overflow-hidden',
            'bg-rose-500/14 border-y border-rose-400/50',
            'transition-opacity',
            'duration-[1200ms]',
            rowOpacityClass,
          ].join(' ')}
          style={rowStyle}
        >
          {/* Base soft glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-200/10 to-rose-500/0" />

          {/* Noisy / gas-like shimmer */}
          <div className="absolute inset-0 opacity-60 mix-blend-overlay blur-[0.6px]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="rgba(255,255,255,0.00)" />
                  <stop offset="0.5" stopColor="rgba(255,255,255,0.18)" />
                  <stop offset="1" stopColor="rgba(255,255,255,0.00)" />
                </linearGradient>

                <filter id={filterId} x="-20%" y="-40%" width="140%" height="180%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise">
                    <animate
                      attributeName="baseFrequency"
                      dur="2.8s"
                      values="0.75 0.9;0.95 0.8;0.75 0.9"
                      repeatCount="indefinite"
                    />
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G">
                    <animate attributeName="scale" dur="2.4s" values="7;11;7" repeatCount="indefinite" />
                  </feDisplacementMap>
                </filter>
              </defs>

              <rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} filter={`url(#${filterId})`} opacity="0.85" />
            </svg>
          </div>

          {/* Subtle moving grain (static-ish noise) */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.00) 0, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.00) 4px)' }} />
        </div>
      ) : null}
    </div>
  );
}
