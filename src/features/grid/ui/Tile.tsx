import type { PieceType } from '@/gamelogic';
import { TYPE_COLORS } from '@/gamelogic';
import { getTileSrc } from './tiles';

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
  const src = getTileSrc(type);

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

  // Fallback (falls Asset fehlt)
  if (!src) {
    return (
      <div
        className={outerCls}
        style={{
          backgroundColor: TYPE_COLORS[type],
          boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
        }}
      />
    );
  }

  return (
    <div className={outerCls} style={{ boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>
      <img src={src} alt="" aria-hidden="true" draggable={false} className="w-full h-full object-contain select-none pointer-events-none" />
    </div>
  );
}
