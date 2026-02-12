// src/features/devtools-host/ui/hud/objectives/ObjectiveActivatedTerminals.tsx
import type { HudObjective } from '../../../lib/hud/types';
import { formatFraction } from '../../../lib/hud/format';

type ObjectiveActivatedTerminalsLike = Extract<HudObjective, { kind: 'objectiveTerminals' }>;

type Props = {
  objective: ObjectiveActivatedTerminalsLike;
};

export function ObjectiveActivatedTerminals({ objective }: Props) {
  const activated = formatFraction(objective.activated, objective.total);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">Activate Terminals</div>
          <div className="text-xs text-white/55">Keep them charged to stay active</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">{activated} active</div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {objective.states.map((t) => {
          const isActive = t.state === 'active';
          const pct = t.required <= 0 ? 1 : Math.max(0, Math.min(1, t.charge / t.required));

          return (
            <div
              key={t.id}
              className={['rounded-xl border px-2 py-2', isActive ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/10 bg-white/5'].join(' ')}
              title={`Terminal ${t.id}: ${t.charge}/${t.required}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-white/85">T{t.id}</div>
                <div className="text-[10px] text-white/60">
                  {t.charge}/{t.required}
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-black/35">
                <div className="h-full bg-white/55" style={{ width: `${Math.round(pct * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
