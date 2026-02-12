// src/features/devtools-host/ui/hud/sections/HudCenter.tsx
import type { HudModel } from '../../../lib/hud/types';
import { ObjectivePanel } from '../objectives/ObjectivePanel';

type Props = {
  model: HudModel;
};

export function HudCenter({ model }: Props) {
  return (
    <div className="flex items-start justify-center">
      <ObjectivePanel objective={model.objective} />
    </div>
  );
}
