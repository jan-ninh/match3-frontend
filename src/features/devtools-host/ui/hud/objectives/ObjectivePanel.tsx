// src/features/devtools-host/ui/hud/objectives/ObjectivePanel.tsx
import type { HudObjective } from '../../../lib/hud/types';
import { assertNever } from '../../../lib/hud/types';
import { ObjectiveNodes } from './ObjectiveNodes';
import { ObjectiveLeaks } from './ObjectiveLeaks';
import { ObjectiveTerminals } from './ObjectiveTerminals';
import { ObjectiveActivatedTerminals } from './ObjectiveActivatedTerminals';

type Props = {
  objective: HudObjective;
};

export function ObjectivePanel({ objective }: Props) {
  switch (objective.kind) {
    case 'none':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-sm text-white/60">No active objective</div>
          <div className="text-xs text-white/35">Just survive and make progress.</div>
        </div>
      );

    case 'spikes':
    case 'nodes':
      return <ObjectiveNodes objective={objective} />;

    case 'leaks':
      return <ObjectiveLeaks objective={objective} />;

    case 'terminals':
      return <ObjectiveTerminals objective={objective} />;

    case 'objectiveTerminals':
      return <ObjectiveActivatedTerminals objective={objective} />;

    default:
      return assertNever(objective, 'Unhandled objective kind in ObjectivePanel');
  }
}
