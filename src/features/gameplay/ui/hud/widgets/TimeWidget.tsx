// src/features/gameplay/ui/hud/widgets/TimeWidget.tsx
type Props = {
  timeLeftSec: number;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function pad2(n: number): string {
  const v = clampInt(n, 0, 99);
  return v < 10 ? `0${v}` : String(v);
}

function formatMmSs(totalSeconds: number): string {
  const s = clampInt(totalSeconds, 0, 60 * 60);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

export function TimeWidget({ timeLeftSec }: Props) {
  const text = formatMmSs(timeLeftSec);

  return (
    <div
      className={[
        'inline-flex items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2',
        'border-emerald-300/18',
        'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.10)]',
      ].join(' ')}
    >
      <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase whitespace-nowrap">Time</div>
      <div className="font-mono text-sm text-white/85 tabular-nums whitespace-nowrap">{text}</div>
    </div>
  );
}
