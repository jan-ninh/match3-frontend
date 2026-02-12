// src/features/devtools-host/ui/hud/objectives/ObjectiveActivatedTerminals.tsx
import type { HudObjective, HudObjectiveTerminalState } from '../../../lib/hud/types';

type ObjectiveActivatedTerminalsLike = Extract<HudObjective, { kind: 'objectiveTerminals' }>;

type Props = {
  objective: ObjectiveActivatedTerminalsLike;
};

function stateChipClass(state: HudObjectiveTerminalState['state']): string {
  switch (state) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'inactive':
      return 'bg-white/5 text-white/70';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function ObjectiveActivateTerminals({ objective }: Props) {
  const active = objective.activated | 0;
  const total = objective.total | 0;
  const states = objective.states;

  const isDone = total > 0 && active >= total;

  const preTitle = 'Activate Terminals';
  const title = isDone ? 'All terminals activated!' : preTitle;

  const hint = 'Make matches adjacent to terminals to charge them. Watch the laser warning!';

  // Keyline / Glow (match Level 01 HUD structure)
  const baseKeyline = 'border-rose-300/18';
  const keyline = isDone ? 'border-emerald-300/18' : baseKeyline;

  const baseGlow = 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(244,63,94,0.12)]';
  const glowA = isDone ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]' : baseGlow;

  // Progress segments (old style)
  const segTotal = Math.min(Math.max(0, total), 6);
  const segDone = Math.min(Math.max(0, active), segTotal);

  const baseSegOn = 'bg-rose-400/35 border-rose-300/35';
  const segOn = isDone ? 'bg-emerald-400/35 border-emerald-300/35' : baseSegOn;

  const showStateChips = states.length > 0;

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
            ACTIVE {active}/{total}
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
            ACTIVE {active}/{total}
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

        {/* Terminal state chips (like Level 01 HUD "inline chips") */}
        {showStateChips ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden shrink-0 max-w-[clamp(10ch,18vw,28ch)]">
              {states.map((t) => (
                <div
                  key={t.id}
                  className={['flex items-center gap-1 px-2 py-0.5 rounded text-[10px] shrink-0', stateChipClass(t.state)].join(' ')}
                  title={`T${t.id}: ${t.charge}/${t.required} (${t.state})`}
                >
                  <span className="uppercase">{`T${t.id}`}</span>
                  <span>
                    {t.charge}/{t.required}
                  </span>
                  <span>{t.state === 'active' ? '✓' : '⎆'}</span>
                </div>
              ))}
            </div>
            <div className="text-white/25 shrink-0">•</div>
          </>
        ) : null}

        <div className="text-xs text-white/55 whitespace-normal break-words max-w-[clamp(18ch,34vw,60ch)]">{hint}</div>
      </div>
    </>
  );
}
