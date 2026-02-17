// src/features/devtools-host/ui/hud/sections/HudRight.tsx
import type { HudModel } from '../../../lib/hud/typesHud';
import { MovesWidget } from '../widgets/MovesWidget';
import { OutcomeBadge } from '../widgets/OutcomeBadge';

type Props = {
  model: HudModel;
};

export function HudRight({ model }: Props) {
  return (
    <div className="relative flex flex-col items-end gap-2 mt-31  ">
      <div>
        <MovesWidget movesLeftText={model.movesLeftText} />
        <OutcomeBadge isWin={model.isWin} isLose={model.isLose} />
      </div>
    </div>
  );
}
