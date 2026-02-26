// src/features/grid/ui/cells/renderers/TerminalOverlay.tsx
import type { PieceType } from '@/gamelogic';

import { GAP, TILE_SIZE } from '../../../lib/constants';
import { PipsRow } from '../primitives/PipsRow';

type PairRole = 'left' | 'right';

type Props = {
  state: 'locked' | 'open' | 'verified';
  charge: number;
  requiredCharge: number;
  chargeColor: PieceType;

  /**
   * Level 05: two terminals are visually grouped into a single 2-cell rectangle.
   * - left: renders the full slab spanning 2 cells (incl. grid gap)
   * - right: renders nothing (slab is owned by the left cell)
   */
  pairRole?: PairRole;
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

function LockBadge() {
  return (
    <div className="h-8 w-8 rounded-lg border-2 flex items-center justify-center bg-slate-600/30 border-slate-400/40">
      <span className="text-slate-300 text-xs">🔒</span>
    </div>
  );
}

function TerminalPairSlabOverlay() {
  const pairW = TILE_SIZE * 2 + GAP;

  return (
    <>
      <div
        className="absolute top-0 left-0 h-full rounded-xl bg-slate-950/70 pointer-events-none"
        style={{ width: pairW }}
        data-match3-terminal-pair=""
      />

      <div
        className="absolute top-0 left-0 h-full rounded-xl border-2 border-slate-500/40 shadow-[0_0_14px_rgba(100,116,139,0.20)] pointer-events-none"
        style={{ width: pairW }}
      />

      <div className="absolute top-0 left-0 h-full flex items-center pointer-events-none" style={{ width: pairW }}>
        <div className="flex items-center justify-center" style={{ width: TILE_SIZE }}>
          <LockBadge />
        </div>

        <div style={{ width: GAP }} aria-hidden="true" />

        <div className="flex items-center justify-center" style={{ width: TILE_SIZE }}>
          <LockBadge />
        </div>
      </div>
    </>
  );
}

export function TerminalOverlay({ state, charge, requiredCharge, chargeColor, pairRole }: Props) {
  // Level 05: two terminals share ONE visual slab (2 locks, no pips/labels)
  if (pairRole === 'right') return null;
  if (pairRole === 'left') return <TerminalPairSlabOverlay />;

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
