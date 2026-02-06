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

export default function Tile({ type, selected, dragging, preview, locked, shaking, className }: Props) {
  const sprite = getTileSprite(type);

  const outerCls = [
    'w-full h-full rounded-xl',
    locked ? 'opacity-70' : '',
    selected || preview ? 'ring-2 ring-white/20' : '',
    dragging ? 'scale-[1.03]' : '',
    shaking ? 'animate-[shakeX_180ms_ease-in-out_1]' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

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

  const scaleX = TILE_SIZE / sprite.w;
  const scaleY = TILE_SIZE / sprite.h;

  const spriteStyle: CSSProperties = {
    backgroundImage: `url(${sprite.sheet})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sprite.sheetW * scaleX}px ${sprite.sheetH * scaleY}px`,
    backgroundPosition: `${-sprite.x * scaleX}px ${-sprite.y * scaleY}px`,
  };

  return (
    <div className={outerCls} style={{ boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>
      <div className="w-full h-full select-none pointer-events-none" style={spriteStyle} />
    </div>
  );
}
