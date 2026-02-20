import type { HudModel } from '../../../lib/hud/typesHud';
import { useMatchRushTimeLeftSec } from '../level07/matchRushTimeStore';
import { TimeWidget } from '../widgets/TimeWidget';
import { LevelMetaWidget } from '../widgets/LevelMetaWidget';

type Props = {
  model: HudModel;
};

export function HudLeft({ model }: Props) {
  const timeLeftSec = useMatchRushTimeLeftSec();

  return (
    <div className="relative">
      <div className=" flex flex-col items-start gap-2">
        <LevelMetaWidget levelId={model.levelId} />
      </div>
      <div className="absolute flex flex-col items-end gap-2 mt-20  ">{model.levelId === 7 ? <TimeWidget timeLeftSec={timeLeftSec} /> : null}</div>
    </div>
  );
}
