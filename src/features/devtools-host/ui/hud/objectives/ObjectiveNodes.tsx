// src/features/devtools-host/ui/hud/objectives/ObjectiveNodes.tsx
import type { HudObjective } from '../../../lib/hud/types';
import { formatFraction } from '../../../lib/hud/format';

type ObjectiveNodesLike = Extract<HudObjective, { kind: 'spikes' | 'nodes' }>;

type Props = {
  objective: ObjectiveNodesLike;
};

export function ObjectiveNodes({ objective }: Props) {
  const title = objective.kind === 'spikes' ? 'Clear Spikes' : 'Breach Firewall';
  const progress = formatFraction(objective.breachDone, objective.breachTotal);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">{title}</div>
          <div className="text-xs text-white/55">Progress & gate status</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">{progress}</div>

          <div
            className={[
              'rounded-xl border px-3 py-2 text-xs font-semibold',
              objective.gateOpen ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/25 bg-amber-500/10 text-amber-200',
            ].join(' ')}
          >
            {objective.gateOpen ? 'GATE OPEN' : 'GATE CLOSED'}
          </div>
        </div>
      </div>
    </div>
  );
}
