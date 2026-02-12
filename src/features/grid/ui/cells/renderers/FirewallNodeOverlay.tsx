import { PipsRow } from '../primitives/PipsRow';

type Props = {
  hp: number;
  maxHp: number;
};

export function FirewallNodeOverlay({ hp, maxHp }: Props) {
  const pipCount = Math.min(3, maxHp);

  return (
    <>
      <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
      <div className="absolute inset-0 rounded-xl border border-cyan-300/20 shadow-[0_0_18px_rgba(34,211,238,0.18)]" />
      <div className="absolute inset-2 rounded-lg bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.18)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full bg-cyan-300/20 border border-cyan-200/20 shadow-[0_0_14px_rgba(34,211,238,0.25)]" />
      </div>

      <PipsRow
        count={pipCount}
        filledCount={Math.max(0, Math.min(pipCount, hp))}
        className="absolute bottom-1 left-1 right-1 flex justify-center gap-1"
        pipClassName={(filled) =>
          [
            'h-1.5 w-4 rounded-full border',
            filled ? 'bg-cyan-400/55 border-cyan-200/35 shadow-[0_0_10px_rgba(34,211,238,0.18)]' : 'bg-white/5 border-white/15',
          ].join(' ')
        }
      />
    </>
  );
}
