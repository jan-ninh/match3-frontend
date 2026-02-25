import { PipsRow } from '../primitives/PipsRow';

type Props = {
  hp: number;
  maxHp: number;
};

export function FirewallNodeOverlay({ hp, maxHp }: Props) {
  // Special-case: maxHp=1 nodes are "spike-style". We reuse this overlay for
  // Level 04 dormant firewalls to show OFF (hp=0) vs ON (hp>0).
  const isSpikeStyle = maxHp === 1;

  if (isSpikeStyle) {
    const isOn = hp > 0;

    return (
      <>
        {/* base */}
        <div className="absolute inset-0 rounded-xl bg-slate-950/80" />

        {/* OFF: subtle casing (no glow) */}
        {!isOn && (
          <>
            <div className="absolute inset-0 rounded-xl border border-slate-200/12" />
            <div className="absolute inset-2 rounded-lg bg-white/3" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-slate-100/6 border border-slate-200/10" />
            </div>
          </>
        )}

        {/* ON: red glow */}
        {isOn && (
          <>
            <div className="absolute inset-0 rounded-xl bg-red-500/18 blur-[12px] shadow-[0_0_34px_rgba(239,68,68,0.55)]" />
            <div className="absolute inset-0 rounded-xl border border-red-200/35 shadow-[0_0_20px_rgba(248,113,113,0.45)]" />
            <div className="absolute inset-2 rounded-lg bg-red-500/10 shadow-[0_0_18px_rgba(248,113,113,0.35)]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-red-300/18 border border-red-200/25 shadow-[0_0_14px_rgba(248,113,113,0.40)]" />
            </div>
          </>
        )}

        <PipsRow
          count={1}
          filledCount={isOn ? 1 : 0}
          className="absolute bottom-1 left-1 right-1 flex justify-center gap-1"
          pipClassName={(filled) =>
            [
              'h-1.5 w-6 rounded-full border',
              filled ? 'bg-red-400/55 border-red-200/35 shadow-[0_0_10px_rgba(248,113,113,0.30)]' : 'bg-white/5 border-white/12',
            ].join(' ')
          }
        />
      </>
    );
  }

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
