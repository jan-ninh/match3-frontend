import type { HudModel } from '../../../lib/hud/typesHud';
import { MovesWidget } from '../widgets/MovesWidget';
import { OutcomeBadge } from '../widgets/OutcomeBadge';
import { shouldShowMovesWidget } from '@/gamelogic/scenarios/policies';

type Props = {
  model: HudModel;
};

export function HudRight({ model }: Props) {
  return (
    <div className="relative flex flex-col items-end gap-2 mt-31  ">
      <div>
        {shouldShowMovesWidget(model.levelId) ? <MovesWidget movesLeftText={model.movesLeftText} /> : null}
        <OutcomeBadge isWin={model.isWin} isLose={model.isLose} />
      </div>
    </div>
  );
}
