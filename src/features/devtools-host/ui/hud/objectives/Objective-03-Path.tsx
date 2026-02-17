// src/features/devtools-host/ui/hud/objectives/Objective-03-Path.tsx
import type { HudObjective } from '../../../lib/hud/typesHud';

type ObjectivePathLike = Extract<HudObjective, { kind: 'signal' }>;

type Props = {
  objective: ObjectivePathLike;
};

export function ObjectivePath({ objective }: Props) {
  const charged = objective.chargedCount | 0;
  const linked = Boolean(objective.linked);

  const isDone = linked;
  //===================================
  // TITLE + HINT
  //===================================
  const title = isDone ? 'Signal linked!' : 'The Path';
  const hint = 'The grid remembers..';

  // Keyline / Glow
  const baseKeyline = 'border-sky-300/18';
  const keyline = isDone ? 'border-emerald-300/18' : baseKeyline;

  const baseGlow = 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(56,189,248,0.12)]';
  const glowA = isDone ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]' : baseGlow;

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1) CONTAINER: OBJECTIVE */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={[
          'pointer-events-auto',
          'inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2 mt-4',
          keyline,
          glowA,
        ].join(' ')}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase whitespace-nowrap">Objective</div>
          </div>

          <div className="mt-0.5 text-[15px] font-semibold text-white/90 leading-snug truncate">{title}</div>
        </div>

        <div className="h-7 w-px bg-white/10 shrink-0" aria-hidden="true" />

        <div className="flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            CHARGED {charged}
            <span className="text-white/25"> • </span>
            {isDone ? 'LINKED' : 'NOT LINKED'}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2) CONTAINER: OBJECTIVE DESCRIPTION (HINT + A→B CHIP) */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={[
          'pointer-events-auto',
          'inline-flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)] overflow-hidden',
        ].join(' ')}
      >
        {/* A → B chip */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-200 border border-emerald-300/20">
            A<span className="text-emerald-200/60 mx-1">→</span>B
          </div>
          <div className="text-white/25 shrink-0 hidden sm:block">•</div>
        </div>

        <div className="text-xs text-white/55 whitespace-normal break-words max-w-[clamp(18ch,34vw,60ch)]">{hint}</div>
      </div>
    </>
  );
}
