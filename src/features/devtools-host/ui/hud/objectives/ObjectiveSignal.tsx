// src/features/devtools-host/ui/hud/objectives/ObjectiveSignal.tsx
import type { HudObjective } from '../../../lib/hud/typesHud';

type HudObjectiveSignal = Extract<HudObjective, { kind: 'signal' }>;

type Props = {
  objective: HudObjectiveSignal;
};

export function ObjectiveSignal({ objective }: Props) {
  const { linked, chargedCount } = objective;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <div className="text-xs uppercase tracking-wide text-white/60">Signal</div>
        <div className="text-sm font-semibold text-white">{linked ? 'Linked' : 'Not linked'}</div>
      </div>

      <div className="text-sm text-white/80">
        Charge: <span className="font-semibold text-white">{chargedCount}</span>
      </div>
    </div>
  );
}
