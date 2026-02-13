import type { CSSProperties } from 'react';

import { PipsRow } from '../primitives/PipsRow';

type Props = {
  sealed: boolean;
  progress: number;
  required: number;
  sealedSpriteStyle?: CSSProperties;
  openSpriteStyle?: CSSProperties;
};

export function LeakOverlay({ sealed, progress, required, sealedSpriteStyle, openSpriteStyle }: Props) {
  return (
    <>
      <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
      <div
        className={[
          'absolute inset-0 rounded-xl border',
          sealed
            ? 'border-emerald-300/25 shadow-[0_0_18px_rgba(16,185,129,0.20)]'
            : 'border-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.25)] animate-pulse',
        ].join(' ')}
      />

      {sealed && sealedSpriteStyle ? (
        <div className="absolute inset-0 rounded-xl opacity-95" style={sealedSpriteStyle} />
      ) : !sealed && openSpriteStyle ? (
        <div className="absolute inset-0 rounded-xl opacity-95" style={openSpriteStyle} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={['h-6 w-6 rounded-full border-2', sealed ? 'bg-emerald-500/30 border-emerald-300/40' : 'bg-amber-500/30 border-amber-300/50'].join(' ')}
          >
            {sealed ? (
              <div className="w-full h-full flex items-center justify-center text-emerald-200 text-xs">✓</div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-amber-200 text-xs">!</div>
            )}
          </div>
        </div>
      )}

      <PipsRow
        count={required}
        filledCount={Math.max(0, Math.min(required, progress))}
        className="absolute bottom-1 left-1 right-1 flex justify-center gap-1"
        pipClassName={(filled) =>
          [
            'h-1.5 w-4 rounded-full border',
            filled ? 'bg-emerald-400/55 border-emerald-200/35 shadow-[0_0_10px_rgba(16,185,129,0.20)]' : 'bg-white/5 border-white/15',
          ].join(' ')
        }
      />
    </>
  );
}
