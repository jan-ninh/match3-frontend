import type { CSSProperties } from 'react';

type Props = {
  spriteStyle?: CSSProperties;
};

export function ContaminationOverlay({ spriteStyle }: Props) {
  return (
    <>
      <div className="absolute inset-0 rounded-xl bg-slate-950/60" />
      <div className="absolute inset-0 rounded-xl border border-rose-400/30 shadow-[0_0_16px_rgba(251,113,133,0.22)]" />

      {spriteStyle ? (
        <div className="absolute inset-0 rounded-xl opacity-90" style={spriteStyle} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full bg-rose-500/40 border border-rose-300/40 shadow-[0_0_12px_rgba(251,113,133,0.30)]">
            <div className="w-full h-full flex items-center justify-center text-rose-200 text-[10px]">☣</div>
          </div>
        </div>
      )}
    </>
  );
}
