import type { HudObjective } from '../../../lib/hud/types';

type ObjectiveLeaksLike = Extract<HudObjective, { kind: 'leaks' }>;

type Props = {
  objective: ObjectiveLeaksLike;
};

export function ObjectiveLeaks({ objective }: Props) {
  const sealed = objective.leaksSealed | 0;
  const total = objective.leaksTotal | 0;

  const contamN = objective.contaminationCount | 0;
  const contamMax = objective.contaminationThreshold;

  const contamText = contamMax == null ? `${contamN}` : `${contamN}/${contamMax | 0}`;

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
        <div className="truncate text-sm font-semibold text-white/90">Patch the Hole</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-white/55">Sealed</div>
          <div className="text-sm font-semibold text-white/90">
            {sealed}/{total}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-white/55">Contam</div>
          <div className="text-sm font-semibold text-white/90">{contamText}</div>
        </div>
      </div>
    </div>
  );
}
