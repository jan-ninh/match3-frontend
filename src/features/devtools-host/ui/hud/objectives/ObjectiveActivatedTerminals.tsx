import type { HudObjective, HudObjectiveTerminalState } from '../../../lib/hud/types';

type ObjectiveActivatedTerminalsLike = Extract<HudObjective, { kind: 'objectiveTerminals' }>;

type Props = {
  objective: ObjectiveActivatedTerminalsLike;
};

function chipStyle(state: HudObjectiveTerminalState['state']): string {
  switch (state) {
    case 'active':
      return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
    case 'inactive':
      return 'border-white/10 bg-white/5 text-white/85';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function ObjectiveActivatedTerminals({ objective }: Props) {
  const active = objective.activated | 0;
  const total = objective.total | 0;

  return (
    <div
      className={[
        'pointer-events-auto',
        'flex flex-col gap-3',
        'rounded-2xl border border-white/10 bg-black/30 px-4 py-3',
        'backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-white/55">Objective</div>
          <div className="truncate text-sm font-semibold text-white/90">Activate Terminals</div>
          <div className="text-xs text-white/45">Keep them charged to stay active</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-white/55">Active</div>
          <div className="text-sm font-semibold text-white/90">
            {active}/{total}
          </div>
        </div>
      </div>

      {objective.states.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {objective.states.map((t) => (
            <div
              key={t.id}
              className={['flex items-center gap-2 rounded-xl border px-2 py-1 text-xs font-semibold', chipStyle(t.state)].join(' ')}
              title={`T${t.id}: ${t.charge}/${t.required} (${t.state})`}
            >
              <span className="opacity-90">T{t.id}</span>
              <span className="text-[11px] font-medium opacity-90">
                {t.charge}/{t.required}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
