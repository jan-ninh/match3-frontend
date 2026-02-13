import { PipsRow } from '../primitives/PipsRow';

type Props = {
  state: 'inactive' | 'active';
  charge: number;
  requiredCharge: number;
};

export function ObjectiveTerminalOverlay({ state, charge, requiredCharge }: Props) {
  return (
    <>
      <div className="absolute inset-0 rounded-xl bg-slate-950/80" />
      <div
        className={[
          'absolute inset-0 rounded-xl border-2',
          state === 'active' ? 'border-emerald-400/60 shadow-[0_0_24px_rgba(16,185,129,0.45)]' : 'border-amber-500/50 shadow-[0_0_18px_rgba(245,158,11,0.30)]',
        ].join(' ')}
      />

      {state === 'inactive' ? (
        <div
          className="absolute inset-0 rounded-xl animate-pulse"
          style={{ background: 'radial-gradient(circle at center, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
        />
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={[
            'h-10 w-10 rounded-lg border-2 flex items-center justify-center',
            state === 'active' ? 'bg-emerald-500/40 border-emerald-300/60' : 'bg-amber-500/25 border-amber-400/50',
          ].join(' ')}
        >
          {state === 'active' ? <span className="text-emerald-200 text-lg">✓</span> : <span className="text-amber-200 text-sm">⎆</span>}
        </div>
      </div>

      {state === 'inactive' && requiredCharge > 0 ? (
        <PipsRow
          count={requiredCharge}
          filledCount={Math.max(0, Math.min(requiredCharge, charge))}
          className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-center gap-1"
          pipClassName={(filled) =>
            [
              'h-2 flex-1 rounded-full border',
              filled ? 'bg-amber-400/70 border-amber-300/60 shadow-[0_0_8px_rgba(245,158,11,0.35)]' : 'bg-white/10 border-white/20',
            ].join(' ')
          }
        />
      ) : null}

      <div className="absolute top-1 left-1 right-1 flex justify-center">
        <span
          className={[
            'text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold',
            state === 'active' ? 'text-emerald-200/90 bg-emerald-500/20' : 'text-amber-200/80 bg-amber-500/15',
          ].join(' ')}
        >
          {state === 'active' ? 'ACTIVE' : 'TERMINAL'}
        </span>
      </div>
    </>
  );
}
