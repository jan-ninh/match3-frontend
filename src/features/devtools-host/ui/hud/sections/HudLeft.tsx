// src/features/devtools-host/ui/hud/sections/HudLeft.tsx
import type { HudModel } from '../../../lib/hud/typesHud';
import { useMatchRushTimeLeftSec } from '../level07/matchRushTimeStore';
import { TimeWidget } from '../widgets/TimeWidget';
import { LevelMetaWidget } from '../widgets/LevelMetaWidget';

type Props = {
  model: HudModel;
};

export function HudLeft({ model }: Props) {
  // Level 07 uses its own store; Level 09 uses engine-derived HUD model field.
  const matchRushTimeLeftSec = useMatchRushTimeLeftSec();

  const timeLeftSec = model.levelId === 9 ? model.timeLeftSec : model.levelId === 7 ? matchRushTimeLeftSec : null;

  return (
    <div className="flex flex-col items-start gap-2 relative z-20">
      <LevelMetaWidget levelId={model.levelId} />

      {timeLeftSec != null ? (
        <div className="mt-2">
          <TimeWidget timeLeftSec={timeLeftSec} />
        </div>
      ) : null}
    </div>
  );
}
