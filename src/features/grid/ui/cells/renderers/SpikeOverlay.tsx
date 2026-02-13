// src/features/grid/ui/cells/renderers/SpikeOverlay.tsx
import type { CSSProperties } from 'react';

type Props = {
  // kept for compatibility with current call-site (CellOverlayRenderer),
  // but intentionally ignored in this "CSS-only node" experiment.
  spikeSpriteStyle?: CSSProperties;
};

export function SpikeOverlay({ spikeSpriteStyle: _spikeSpriteStyle }: Props) {
  return (
    <>
      {/* darker base so red pops harder */}
      <div className="absolute inset-0 rounded-xl bg-slate-950/75" />

      {/* outer glow (bigger + stronger) */}
      <div className={['absolute inset-0 rounded-xl', 'bg-red-500/22', 'blur-[14px]', 'shadow-[0_0_46px_rgba(239,68,68,0.70)]', 'animate-pulse'].join(' ')} />

      {/* inner glow (punch) */}
      <div className={['absolute inset-0 rounded-xl', 'bg-red-500/12', 'blur-[6px]', 'shadow-[0_0_26px_rgba(248,113,113,0.55)]'].join(' ')} />

      {/* crisp frame */}
      <div className={['absolute inset-0 rounded-xl ', 'shadow-[0_0_22px_rgba(248,113,113,0.55)]'].join(' ')} />

      {/* "crackable node" — CSS-only */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-10 w-10">
          {/* outer core */}
          <div
            className={[
              'absolute inset-0 rounded-full border',
              'bg-gradient-to-br from-red-500/65 via-red-500/25 to-transparent',
              'border-red-200/55',
              'shadow-[0_0_18px_rgba(248,113,113,0.55)]',
            ].join(' ')}
          />

          {/* inner core */}
          <div
            className={['absolute inset-[6px] rounded-full border', 'bg-red-500/18', 'border-red-100/35', 'shadow-[inset_0_0_14px_rgba(0,0,0,0.60)]'].join(' ')}
          />

          {/* highlight dot */}
          <div className="absolute left-[10px] top-[9px] h-2 w-2 rounded-full bg-red-100/55" />

          {/* crack lines (stronger) */}
          <div className="absolute left-1/2 top-1/2 h-[18px] w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-[18deg] rounded bg-red-100/55 shadow-[0_0_14px_rgba(248,113,113,0.35)]" />
          <div className="absolute left-1/2 top-1/2 h-[12px] w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-[-32deg] rounded bg-red-100/45 shadow-[0_0_14px_rgba(248,113,113,0.28)]" />
          <div className="absolute left-1/2 top-1/2 h-[10px] w-[2px] -translate-x-1/2 -translate-y-1/2 translate-x-[6px] translate-y-[2px] rotate-[62deg] rounded bg-red-100/35 shadow-[0_0_14px_rgba(248,113,113,0.22)]" />

          {/* danger glyph */}
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-red-50/90">!</div>
        </div>
      </div>
    </>
  );
}
