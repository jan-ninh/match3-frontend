import type { HudModel } from '../../../lib/hud/types-hud';
import { MovesWidget } from '../widgets/MovesWidget';
import { OutcomeBadge } from '../widgets/OutcomeBadge';

type Props = {
  model: HudModel;
};

export function HudRight({ model }: Props) {
  return (
    <div className="flex flex-col items-end gap-3">
      <MovesWidget movesLeftText={model.movesLeftText} />
      <OutcomeBadge isWin={model.isWin} isLose={model.isLose} />
    </div>
  );
}
