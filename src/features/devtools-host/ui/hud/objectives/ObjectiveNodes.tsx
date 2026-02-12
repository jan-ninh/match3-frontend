import type { HudObjective } from '../../../lib/hud/types';

type ObjectiveNodesLike = Extract<HudObjective, { kind: 'spikes' | 'nodes' }>;

type Props = {
  objective: ObjectiveNodesLike;
};

export function ObjectiveNodes({ objective }: Props) {
  const title = objective.kind === 'spikes' ? 'Clear Spikes' : 'Breach Firewall';
  const done = objective.breachDone | 0;
  const total = objective.breachTotal | 0;

  return (
    <div
      className={[
        'pointer-events-auto',
        'flex items-center justify-between gap-4',
        'rounded-2xl border border-white/10 bg-black/30 px-4 py-3',
        'backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-white/55">Objective</div>
        <div className="truncate text-sm font-semibold text-white/90">{title}</div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
        <div className="text-[10px] uppercase tracking-wide text-white/55">Breach</div>
        <div className="text-sm font-semibold text-white/90">
          {done}/{total}
        </div>
      </div>
    </div>
  );
}
