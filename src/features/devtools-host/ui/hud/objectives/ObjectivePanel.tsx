// src/features/devtools-host/ui/hud/objectives/ObjectivePanel.tsx
import type { HudObjective } from '../../../lib/hud/types';
import { ObjectiveNodes } from './Objective-01-Nodes';
import { ObjectiveLeaks } from './Objective-02-Leaks';
import { ObjectiveTerminals } from './ObjectiveTerminals';
import { ObjectiveActivatedTerminals } from './ObjectiveActivatedTerminals';
import { ObjectiveSignal } from './ObjectiveSignal';

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

    case 'signal':
      return <ObjectiveSignal objective={objective} />;

    default: {
      // Runtime safety: never hard-crash the whole game because of a HUD mismatch.
      // In DEV we show a small debug panel so you can see what kind came through.
      const kind = (objective as unknown as { kind?: unknown }).kind;
      if (import.meta.env.DEV) {
        return (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs">
            <div className="font-semibold">HUD error: unknown objective kind</div>
            <div>
              kind: <span className="font-mono">{String(kind)}</span>
            </div>
          </div>
        );
      }
      return null;
    }
  }
}
