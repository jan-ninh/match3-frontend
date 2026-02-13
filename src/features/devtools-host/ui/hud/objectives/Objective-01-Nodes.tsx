// src/features/devtools-host/ui/hud/objectives/Objective-01-Spikes.tsx
import type { HudObjective } from '../../../lib/hud/typesHud';

type ObjectiveNodesLike = Extract<HudObjective, { kind: 'spikes' | 'nodes' }>;

type Props = {
  objective: ObjectiveNodesLike;
};

export function ObjectiveNodes({ objective }: Props) {
  const isSpikes = objective.kind === 'spikes';

  const title = 'Crack the Nodes!';
  const hint = 'Match next to a node to damage it. Break all nodes.';

  const done = objective.breachDone | 0;
  const total = objective.breachTotal | 0;

  const isDone = total > 0 && done >= total;

  // Keyline / Glow
  const baseKeyline = isSpikes ? 'border-white/14' : 'border-fuchsia-300/18';
  const keyline = isDone ? 'border-emerald-300/18' : baseKeyline;

  const baseGlow = isSpikes
    ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(255,255,255,0.08)]'
    : 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(217,70,239,0.12)]';

  const glowA = isDone ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]' : baseGlow;

  // Progress segments
  const segTotal = Math.min(Math.max(0, total), 6);
  const segDone = Math.min(Math.max(0, done), segTotal);

  const baseSegOn = isSpikes ? 'bg-white/20 border-white/25' : 'bg-fuchsia-400/35 border-fuchsia-300/35';
  const segOn = isDone ? 'bg-emerald-400/35 border-emerald-300/35' : baseSegOn;

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1) CONTAINER: OBJECTIVE */}
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
            BREACH {done}/{total}
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
      {/* 2) CONTAINER: OBJECTIVE DESCRIPTION (HINT) */}
      {/* ------------------------------------------------------------------- */}
      <div className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)] overflow-hidden">
        {/* small-screen progress */}
        <div className="sm:hidden flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            BREACH {done}/{total}
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

        <div className="text-xs text-white/55 whitespace-normal break-words max-w-[clamp(18ch,34vw,60ch)]">{hint}</div>
      </div>
    </>
  );
}
