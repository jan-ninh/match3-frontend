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
      return null;

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
