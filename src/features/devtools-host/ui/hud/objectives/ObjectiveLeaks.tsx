// src/features/devtools-host/ui/hud/objectives/ObjectiveLeaks.tsx
import type { HudObjective } from '../../../lib/hud/types';
import { formatFraction } from '../../../lib/hud/format';

type ObjectiveLeaksLike = Extract<HudObjective, { kind: 'leaks' }>;

type Props = {
  objective: ObjectiveLeaksLike;
};

export function ObjectiveLeaks({ objective }: Props) {
  const progress = formatFraction(objective.leaksSealed, objective.leaksTotal);
  const contam =
    objective.contaminationThreshold == null ? `${objective.contaminationCount}` : `${objective.contaminationCount}/${objective.contaminationThreshold}`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">Patch the Hole</div>
          <div className="text-xs text-white/55">Seal leaks before contamination wins</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">{progress} sealed</div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">Contam {contam}</div>
        </div>
      </div>
    </div>
  );
}
