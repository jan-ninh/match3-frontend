type Props = {
  percent: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function MatchRushProgressBar({ percent }: Props) {
  const p = clamp(Number.isFinite(percent) ? percent : 0, 0, 100);
  const label = `${Math.round(p)}%`;

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border border-cyan-300/18 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
      <div className="min-w-0 flex-1">
        <div className="h-3 rounded-full bg-white/8 border border-white/10 overflow-hidden">
          <div
            className="h-full bg-cyan-400/35 shadow-[0_0_18px_rgba(34,211,238,0.20)] transition-[width] duration-500 ease-out"
            style={{ width: `${p}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="font-mono text-xs text-white/75 tabular-nums whitespace-nowrap w-12 text-right">{label}</div>
    </div>
  );
}
