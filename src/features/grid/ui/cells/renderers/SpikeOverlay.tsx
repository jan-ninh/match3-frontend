import type { CSSProperties } from 'react';

type Props = {
  spikeSpriteStyle?: CSSProperties;
};

export function SpikeOverlay({ spikeSpriteStyle }: Props) {
  return (
    <>
      <div className="absolute inset-0 rounded-xl" />
      <div className="absolute inset-2 rounded-lg" />

      {spikeSpriteStyle ? (
        <div className="absolute inset-0 rounded-xl opacity-95" style={spikeSpriteStyle} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 rotate-45 rounded-[6px] bg-white/5 border border-white/15 shadow-[0_0_14px_rgba(255,255,255,0.10)]" />
        </div>
      )}
    </>
  );
}
