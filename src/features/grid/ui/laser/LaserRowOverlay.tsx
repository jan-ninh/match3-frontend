// src/features/grid/ui/laser/LaserRowOverlay.tsx
import { useEffect } from 'react';
import type { CSSProperties } from 'react';

export type LaserRowOverlayProps = Readonly<{
  armed: boolean;
  row: number | null;
  rowVisible?: boolean;
  height: number;
  zIndex?: number;
}>;

export function LaserRowOverlay({ armed, row, rowVisible = true, height, zIndex = 0 }: LaserRowOverlayProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleId = 'match3-laser-row-fx-style';
    if (document.getElementById(styleId)) return;

    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
@keyframes match3LaserNoiseDrift {
  0% { background-position: 0% 0%, 50% 50%, 0% 0%; transform: translate3d(0,0,0); }
  50% { background-position: 120% 60%, 20% 80%, 40% 100%; transform: translate3d(-1px, 0, 0); }
  100% { background-position: 240% 0%, 60% 20%, 0% 0%; transform: translate3d(0,0,0); }
}

@keyframes match3LaserSmokeWobble {
  0% { transform: translate3d(-2%, 0, 0) scale(1.02); }
  50% { transform: translate3d(2%, 0, 0) scale(1.04); }
  100% { transform: translate3d(-2%, 0, 0) scale(1.02); }
}

.match3-laser-row-noise {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%),
    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, rgba(0,0,0,0) 1px 3px);
  background-size: 180px 90px, 220px 110px, 100% 100%;
  animation: match3LaserNoiseDrift 2.6s linear infinite;
  mix-blend-mode: overlay;
  opacity: 0.55;
}

.match3-laser-row-smoke {
  background-image:
    radial-gradient(closest-side at 15% 50%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%),
    radial-gradient(closest-side at 55% 40%, rgba(255,255,255,0.08), rgba(255,255,255,0) 72%),
    radial-gradient(closest-side at 85% 60%, rgba(255,255,255,0.07), rgba(255,255,255,0) 75%);
  filter: blur(2px);
  opacity: 0.55;
  animation: match3LaserSmokeWobble 3.8s ease-in-out infinite;
}
`.trim();
    document.head.appendChild(el);
  }, []);

  if (!armed) return null;

  const rowH = height > 0 ? 100 / height : 0;
  const top = row != null && height > 0 ? (row / height) * 100 : null;

  const rootStyle: CSSProperties = { zIndex };

  const rowStyle: CSSProperties =
    top == null
      ? {}
      : {
          top: `${top}%`,
          height: `${rowH}%`,
        };

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={rootStyle}>
      {/* Mode hint: subtle board tint */}
      <div className="absolute inset-0 bg-rose-500/5" />

      {/* Keep the pulsing outline ALWAYS visible while armed. */}
      <div className="absolute inset-0 rounded-md border-2 border-rose-400/30 animate-pulse" />

      {/* Row highlight (with delayed fade controlled by parent). */}
      {top == null ? null : (
        <div
          className={[
            'absolute left-0 right-0 border-y border-rose-400/40',
            'transition-opacity ease-out duration-[1100ms]',
            rowVisible ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          style={rowStyle}
        >
          {/* Base fill */}
          <div className="absolute inset-0 bg-rose-500/18" />
          {/* Grain / noise */}
          <div className="absolute inset-0 match3-laser-row-noise" />
          {/* Soft “gas” drift */}
          <div className="absolute inset-0 match3-laser-row-smoke" />
        </div>
      )}
    </div>
  );
}
