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

  className?: string;
};

export default function Tile({ type, dragging, preview, locked, shaking, className }: Props) {
  const sprite = getTileSprite(type);

  // Keycard special rendering (Level 03)
  const isKeycard = type === 'keycard';

  const outerCls = [
    'w-full h-full rounded-xl',
    locked ? 'opacity-70' : '',
    // Selected-Look sitzt bewusst in <GridOverlaysLayer /> (HUD/Marker-Style).
    preview ? 'ring-2 ring-white/20' : '',
    dragging ? 'scale-[1.03]' : '',
    shaking ? 'animate-[shakeX_180ms_ease-in-out_1]' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Keycard fallback (wenn kein Sprite/Atlas definiert ist)
  if (isKeycard && !sprite) {
    return (
      <div
        className={outerCls}
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.5) 100%)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.35), 0 0 12px rgba(251,191,36,0.25)',
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
        className={outerCls}
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
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

  return (
    <div className={outerCls} style={{ boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>
      <div className="w-full h-full select-none pointer-events-none" style={spriteStyle} />
    </div>
  );
}
