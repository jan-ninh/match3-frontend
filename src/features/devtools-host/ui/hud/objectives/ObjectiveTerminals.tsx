// src/features/devtools-host/ui/hud/objectives/ObjectiveTerminals.tsx
import type { HudObjective } from '../../../lib/hud/types';
import { formatFraction } from '../../../lib/hud/format';
import { TerminalStatesList } from '../widgets/TerminalStatesList';

type ObjectiveTerminalsLike = Extract<HudObjective, { kind: 'terminals' }>;

type Props = {
  objective: ObjectiveTerminalsLike;
};

export function ObjectiveTerminals({ objective }: Props) {
  const verified = formatFraction(objective.terminalsVerified, objective.terminalsTotal);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">Verify Terminals</div>
          <div className="text-xs text-white/55">Charge → open → verify</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">{verified} verified</div>
        </div>
      </div>

      <div className="mt-3">
        <TerminalStatesList terminals={objective.terminalStates} />
      </div>
    </div>
  );
}
