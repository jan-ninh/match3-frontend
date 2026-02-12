import type { HudModel } from '../../../lib/hud/types';
import { ObjectivePanel } from '../objectives/ObjectivePanel';

type Props = {
  model: HudModel;
};

export function HudCenter({ model }: Props) {
  return (
    <div className="flex min-w-[260px] justify-center">
      <ObjectivePanel objective={model.objective} />
    </div>
  );
}
