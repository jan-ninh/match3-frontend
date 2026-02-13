import type { CSSProperties } from 'react';

type Props = {
  spriteStyle?: CSSProperties;
};

export function SealKitOverlay({ spriteStyle }: Props) {
  return (
    <>
      <div className="absolute inset-0 rounded-xl bg-slate-950/50" />
      <div className="absolute inset-0 rounded-xl border border-sky-400/35 shadow-[0_0_18px_rgba(56,189,248,0.25)]" />

      {spriteStyle ? (
        <div className="absolute inset-0 rounded-xl opacity-95" style={spriteStyle} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 rounded-lg bg-sky-500/30 border border-sky-300/40 shadow-[0_0_14px_rgba(56,189,248,0.28)]">
            <div className="w-full h-full flex items-center justify-center text-sky-200 text-xs">🔧</div>
          </div>
        </div>
      )}
    </>
  );
}
