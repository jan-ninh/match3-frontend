// src/features/devtools-host/ui/hud/sections/HudLeft.tsx
import type { HudModel } from '../../../lib/hud/types';
import { LevelMetaWidget } from '../widgets/LevelMetaWidget';
import { MovesWidget } from '../widgets/MovesWidget';
import { LaserWarningBadge } from '../widgets/LaserWarningBadge';

type Props = {
  model: HudModel;
};

export function HudLeft({ model }: Props) {
  return (
    <div className="flex items-start gap-3">
      <LevelMetaWidget levelId={model.levelId} />
      <div className="flex flex-col gap-2">
        <MovesWidget movesLeftText={model.movesLeftText} />
        <LaserWarningBadge warning={model.laserWarning} />
      </div>
    </div>
  );
}
