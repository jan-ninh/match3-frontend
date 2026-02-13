import type { PieceType } from '@/gamelogic';

import { PipsRow } from '../primitives/PipsRow';

type Props = {
  state: 'locked' | 'open' | 'verified';
  charge: number;
  requiredCharge: number;
  chargeColor: PieceType;
};

function colorLabelClass(color: PieceType): string {
  if (color === 'blue') return 'text-blue-300/80 bg-blue-500/10';
  if (color === 'green') return 'text-green-300/80 bg-green-500/10';
  return 'text-purple-300/80 bg-purple-500/10';
}

function pipColorClass(color: PieceType, filled: boolean): string {
  if (color === 'blue') return filled ? 'bg-blue-400/60 border-blue-300/50' : 'bg-white/5 border-white/15';
  if (color === 'green') return filled ? 'bg-green-400/60 border-green-300/50' : 'bg-white/5 border-white/15';
  return filled ? 'bg-purple-400/60 border-purple-300/50' : 'bg-white/5 border-white/15';
}

export function TerminalOverlay({ state, charge, requiredCharge, chargeColor }: Props) {
  return (
    <>
      <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
      <div
        className={[
          'absolute inset-0 rounded-xl border-2',
          state === 'verified'
            ? 'border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
            : state === 'open'
              ? 'border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.30)] animate-pulse'
              : 'border-slate-500/40 shadow-[0_0_12px_rgba(100,116,139,0.20)]',
        ].join(' ')}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={[
            'h-8 w-8 rounded-lg border-2 flex items-center justify-center',
            state === 'verified'
              ? 'bg-emerald-500/30 border-emerald-300/50'
              : state === 'open'
                ? 'bg-sky-500/30 border-sky-300/50'
                : 'bg-slate-600/30 border-slate-400/40',
          ].join(' ')}
        >
          {state === 'verified' ? (
            <span className="text-emerald-200 text-sm">✓</span>
          ) : state === 'open' ? (
            <span className="text-sky-200 text-xs">⎆</span>
          ) : (
            <span className="text-slate-300 text-xs">🔒</span>
          )}
        </div>
      </div>

      {state !== 'verified' && requiredCharge > 0 ? (
        <PipsRow
          count={requiredCharge}
          filledCount={Math.max(0, Math.min(requiredCharge, charge))}
          className="absolute bottom-1 left-1 right-1 flex justify-center gap-1"
          pipClassName={(filled) => ['h-1.5 w-4 rounded-full border', pipColorClass(chargeColor, filled)].join(' ')}
        />
      ) : null}

      {state === 'locked' ? (
        <div className="absolute top-1 left-1 right-1 flex justify-center">
          <span className={['text-[8px] uppercase tracking-wider px-1 rounded', colorLabelClass(chargeColor)].join(' ')}>{chargeColor}</span>
        </div>
      ) : null}
    </>
  );
}
