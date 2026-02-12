import type { HudObjective, HudTerminalState } from '../../../lib/hud/types';

type ObjectiveTerminalsLike = Extract<HudObjective, { kind: 'terminals' }>;

type Props = {
  objective: ObjectiveTerminalsLike;
};

function chipStyle(state: HudTerminalState['state']): string {
  switch (state) {
    case 'verified':
      return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
    case 'open':
      return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
    case 'locked':
      return 'border-white/10 bg-white/5 text-white/85';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function ObjectiveTerminals({ objective }: Props) {
  const verified = objective.terminalsVerified | 0;
  const total = objective.terminalsTotal | 0;

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
          <div className="truncate text-sm font-semibold text-white/90">Verify Terminals</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-white/55">Verified</div>
          <div className="text-sm font-semibold text-white/90">
            {verified}/{total}
          </div>
        </div>
      </div>

      {objective.terminalStates.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {objective.terminalStates.map((t) => (
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
