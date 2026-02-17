// src\features\devtools-host\ui\hud\objectives\Objective-06-Leaks.tsx

import type { HudObjective } from '../../../lib/hud/typesHud';

type ObjectiveLeaksLike = Extract<HudObjective, { kind: 'leaks' }>;

type Props = {
  objective: ObjectiveLeaksLike;
};

export function ObjectiveLeaks({ objective }: Props) {
  const sealed = (objective.leaksSealed ?? 0) | 0;
  const total = (objective.leaksTotal ?? 0) | 0;

  const contaminationCount = (objective.contaminationCount ?? 0) | 0;
  const contaminationThreshold = objective.contaminationThreshold ?? null;

  const isDone = total > 0 && sealed >= total;

  const title = isDone ? 'All leaks sealed!' : 'Patch the Leaks!';
  const hint = 'Make matches beside leaks to get Seal Kits. Trigger a Seal Kit to seal leaks.';

  // Level-1 style: keyline + glow (leaks = amber, done = emerald)
  const keyline = isDone ? 'border-emerald-300/18' : 'border-amber-300/18';

  const glowA = isDone
    ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]'
    : 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(251,191,36,0.12)]';

  // Progress segments (Level-1 style)
  const segTotal = Math.min(Math.max(0, total), 6);
  const segDone = Math.min(Math.max(0, sealed), segTotal);

  const segOn = isDone ? 'bg-emerald-400/35 border-emerald-300/35' : 'bg-amber-400/35 border-amber-300/35';

  // Contamination chip (optional)
  const showContamination = contaminationThreshold !== null;
  const contaminationDanger = contaminationThreshold !== null && contaminationCount >= contaminationThreshold * 0.7;
  const contaminationCritical = contaminationThreshold !== null && contaminationCount >= contaminationThreshold * 0.9;

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1) CONTAINER: OBJECTIVE (Level-1 look) */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={['inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2 mt-4', keyline, glowA].join(
          ' ',
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase whitespace-nowrap">Objective</div>
          </div>

          <div className="mt-0.5 text-[15px] font-semibold text-white/90 leading-snug truncate">{title}</div>
        </div>

        <div className="hidden sm:block h-7 w-px bg-white/10 shrink-0" aria-hidden="true" />

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            SEALED {sealed}/{total}
          </div>

          {segTotal > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {Array.from({ length: segTotal }, (_, i) => {
                const d = i < segDone;
                return (
                  <div
                    key={i}
                    className={[
                      'h-2.5 w-4 rounded-full border transition-all duration-200',
                      d ? segOn : 'bg-white/5 border-white/15',
                      d ? 'shadow-[0_0_12px_rgba(255,255,255,0.08)]' : '',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2) CONTAINER: HINT (Level-1 look) */}
      {/* ------------------------------------------------------------------- */}
      <div className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)] overflow-hidden">
        {/* small-screen progress */}
        <div className="sm:hidden flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            SEALED {sealed}/{total}
          </div>

          {segTotal > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {Array.from({ length: segTotal }, (_, i) => {
                const d = i < segDone;
                return <div key={i} className={['h-2.5 w-4 rounded-full border', d ? segOn : 'bg-white/5 border-white/15'].join(' ')} />;
              })}
            </div>
          ) : null}

          <div className="text-white/25 shrink-0">•</div>
        </div>

        {showContamination ? (
          <>
            <div
              className={[
                'font-mono text-xs tabular-nums whitespace-nowrap shrink-0',
                contaminationCritical ? 'text-rose-300 animate-pulse' : contaminationDanger ? 'text-amber-300' : 'text-white/70',
              ].join(' ')}
            >
              ☣ {contaminationCount}/{contaminationThreshold}
            </div>
            <div className="text-white/25 shrink-0">•</div>
          </>
        ) : null}

        <div className="text-xs text-white/55 whitespace-normal break-words max-w-[clamp(18ch,34vw,60ch)]">{hint}</div>
      </div>
    </>
  );
}
