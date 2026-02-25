// src/features/grid/ui/Tile.tsx
import type { CSSProperties } from 'react';

import type { PieceType } from '@/gamelogic';
import { TILE_SIZE } from '../lib/constants';
import { getTileSprite } from './tiles';

type Props = {
  type: PieceType;

  // optional UI states (Effekte per CSS)
  selected?: boolean;
  dragging?: boolean;
  preview?: boolean;
  locked?: boolean;
  shaking?: boolean;

  // Auto Match Hint (UI-only)
  hintBlink?: boolean;

  className?: string;
};

export default function Tile({ type, dragging, preview, locked, shaking, hintBlink, className }: Props) {
  const sprite = getTileSprite(type);

  // Keycard special rendering (Level 03)
  const isKeycard = type === 'keycard';

  // Base shadow must be a CLASS (not inline), otherwise it overrides Tailwind ring/shadow layers.
  const baseShadow = isKeycard
    ? 'shadow-[0_6px_16px_rgba(0,0,0,0.35),0_0_12px_rgba(251,191,36,0.25)]'
    : 'shadow-[0_6px_16px_rgba(0,0,0,0.35)]';

  // PREMIUM: avoid transform scale on the tile (scale => resampling => blur).
  // Use ring/glow instead for "lift" feedback.
  const dragFx = dragging
    ? 'ring-1 ring-white/20 shadow-[0_10px_22px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.16),0_6px_16px_rgba(0,0,0,0.35)]'
    : '';

  // NOTE:
  // Hint blink should NOT be a border/ring.
  // We blink the *sprite itself* via a same-sprite overlay + drop-shadow glow (alpha-shaped).
  const hintFxFallbackNoSprite = hintBlink ? 'filter brightness-125 saturate-125' : '';

  const outerCls = [
    'relative w-full h-full rounded-xl',
    baseShadow,
    // keep transitions cheap; only box-shadow/filter feel
    'transition-[box-shadow,filter] duration-150',
    locked ? 'opacity-70' : '',
    // Selected-Look sitzt bewusst in <GridOverlaysLayer /> (HUD/Marker-Style).
    preview ? 'ring-2 ring-white/20' : '',
    dragFx,
    hintFxFallbackNoSprite,
    shaking ? 'animate-[shakeX_180ms_ease-in-out_1]' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Keycard fallback (wenn kein Sprite/Atlas definiert ist)
  if (isKeycard && !sprite) {
    return (
      <div
        data-match3-tile=""
        className={outerCls}
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.5) 100%)',
          border: '2px solid rgba(251,191,36,0.5)',
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-amber-100 text-lg">🔑</span>
        </div>
      </div>
    );
  }

  // Fallback (falls Sprite/Atlas fehlt)
  if (!sprite) {
    return (
      <div
        data-match3-tile=""
        className={outerCls}
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
    );
  }

  const scale = TILE_SIZE / sprite.w;

  const spriteStyle: CSSProperties = {
    backgroundImage: `url(${sprite.sheet})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sprite.sheetW * scale}px ${sprite.sheetH * scale}px`,
    backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
  };

  const overlayOpacity = hintBlink ? 0.92 : 0;
  const overlayFilter = hintBlink
    ? 'brightness(1.95) saturate(1.25) drop-shadow(0 0 10px rgba(34,211,238,0.55)) drop-shadow(0 0 20px rgba(34,211,238,0.25)) drop-shadow(0 0 10px rgba(255,255,255,0.14))'
    : 'brightness(1) saturate(1)';

  const spriteOverlayStyle: CSSProperties = {
    ...spriteStyle,
    opacity: overlayOpacity,
    mixBlendMode: 'screen',
    filter: overlayFilter,
    transition: 'opacity 90ms ease-out, filter 120ms ease-out',
    willChange: 'opacity, filter',
  };

  return (
    <div data-match3-tile="" className={outerCls}>
      {/* base sprite */}
      <div className="w-full h-full select-none pointer-events-none" style={spriteStyle} />

      {/* hint blink overlay (same sprite shape via alpha) */}
      <div className="absolute inset-0 select-none pointer-events-none" style={spriteOverlayStyle} />
    </div>
  );
}
