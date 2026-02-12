// src/features/devtools-host/ui/hud/sections/HudRight.tsx
import type { HudModel } from '../../../lib/hud/types';
import { OutcomeBadge } from '../widgets/OutcomeBadge';

type Props = {
  model: HudModel;
};

export function HudRight({ model }: Props) {
  return (
    <div className="flex items-start justify-end">
      <OutcomeBadge isWin={model.isWin} isLose={model.isLose} />
    </div>
  );
}
