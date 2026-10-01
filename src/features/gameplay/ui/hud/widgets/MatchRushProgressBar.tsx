// src/features/gameplay/ui/hud/widgets/MatchRushProgressBar.tsx
type Props = {
  percent: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const LIQUID_CSS = `
@keyframes matchrushLiquidFlow07 {
  0% { background-position: 0% 50%, 0% 0%; }
  50% { background-position: 100% 50%, 70% 100%; }
  100% { background-position: 0% 50%, 0% 0%; }
}

@keyframes matchrushStream07 {
  0% { transform: translateX(-18%); opacity: 0.22; }
  50% { transform: translateX(18%); opacity: 0.32; }
  100% { transform: translateX(-18%); opacity: 0.22; }
}

.matchrushLiquidFill07 {
  position: relative;
  overflow: hidden;
  border-radius: 0;
  background-image:
    linear-gradient(90deg, rgba(16,185,129,0.46), rgba(34,197,94,0.72), rgba(132,204,22,0.52)),
    radial-gradient(110% 160% at 24% 55%, rgba(34,197,94,0.42), rgba(0,0,0,0) 56%);
  background-size: 220% 220%, 170% 170%;
  box-shadow:
    inset 0 0 16px rgba(34,197,94,0.22),
    0 0 18px rgba(34,197,94,0.14);
  animation: matchrushLiquidFlow07 3.2s ease-in-out infinite;
}

/* moving “current” streaks */
.matchrushLiquidFill07::before {
  content: '';
  position: absolute;
  inset: -30% -20%;
  border-radius: 0;
  background-image:
    repeating-linear-gradient(
      115deg,
      rgba(255,255,255,0.00) 0px,
      rgba(255,255,255,0.00) 10px,
      rgba(255,255,255,0.12) 14px,
      rgba(255,255,255,0.00) 18px
    );
  mix-blend-mode: screen;
  filter: blur(0.25px);
  animation: matchrushStream07 2.4s ease-in-out infinite;
}

/* glassy highlight */
.matchrushLiquidFill07::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 0;
  background-image: linear-gradient(120deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 45%, rgba(255,255,255,0.10));
  opacity: 0.34;
}
`;

export function MatchRushProgressBar({ percent }: Props) {
  const p = clamp(Number.isFinite(percent) ? percent : 0, 0, 100);
  const label = `${Math.round(p)}%`;

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-3">
      <style>{LIQUID_CSS}</style>

      <div className="inline-flex w-[min(94vw,64rem)] items-center gap-3 rounded-2xl border border-emerald-300/18 bg-black/65 backdrop-blur-xl px-5 py-3 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
        <div className="min-w-0 flex-1">
          <div className="relative h-4 rounded-none bg-white/6 border border-white/10 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full matchrushLiquidFill07 transition-[width] duration-500 ease-out"
              style={{ width: `${p}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="font-mono text-sm text-white/75 tabular-nums whitespace-nowrap w-14 text-right">{label}</div>
      </div>
    </div>
  );
}
