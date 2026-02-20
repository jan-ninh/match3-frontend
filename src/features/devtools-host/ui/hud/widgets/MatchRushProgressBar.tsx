// src/features/devtools-host/ui/hud/widgets/MatchRushProgressBar.tsx
type Props = {
  percent: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const LIQUID_CSS = `
@keyframes matchrushLiquidFlow07 {
  0% { background-position: 0% 50%, 0% 0%; }
  50% { background-position: 100% 50%, 80% 100%; }
  100% { background-position: 0% 50%, 0% 0%; }
}

@keyframes matchrushBubbles07 {
  0% { transform: translateX(-12%) translateY(0%); opacity: 0.55; }
  50% { transform: translateX(6%) translateY(-6%); opacity: 0.75; }
  100% { transform: translateX(-12%) translateY(0%); opacity: 0.55; }
}

.matchrushLiquidFill07 {
  position: relative;
  overflow: hidden;
  border-radius: 9999px;
  background-image:
    linear-gradient(90deg, rgba(16,185,129,0.55), rgba(34,197,94,0.70), rgba(132,204,22,0.60)),
    radial-gradient(120% 160% at 30% 55%, rgba(34,197,94,0.35), rgba(0,0,0,0) 55%);
  background-size: 200% 200%, 160% 160%;
  box-shadow:
    inset 0 0 18px rgba(34,197,94,0.22),
    0 0 18px rgba(34,197,94,0.16);
  animation: matchrushLiquidFlow07 3.8s ease-in-out infinite;
}

.matchrushLiquidFill07::before {
  content: '';
  position: absolute;
  inset: -20% -10%;
  background-image:
    radial-gradient(circle at 18% 65%, rgba(255,255,255,0.20) 0 1.5px, rgba(255,255,255,0) 2.2px),
    radial-gradient(circle at 42% 40%, rgba(255,255,255,0.14) 0 1.2px, rgba(255,255,255,0) 2.0px),
    radial-gradient(circle at 68% 55%, rgba(255,255,255,0.18) 0 1.4px, rgba(255,255,255,0) 2.1px),
    radial-gradient(circle at 82% 35%, rgba(255,255,255,0.12) 0 1.0px, rgba(255,255,255,0) 1.8px);
  background-size: 92px 48px;
  background-repeat: repeat;
  mix-blend-mode: screen;
  filter: blur(0.2px);
  animation: matchrushBubbles07 2.6s linear infinite;
}

.matchrushLiquidFill07::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(120deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%, rgba(255,255,255,0.12));
  opacity: 0.28;
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
          <div className="relative h-4 rounded-full bg-white/6 border border-white/10 overflow-hidden">
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
