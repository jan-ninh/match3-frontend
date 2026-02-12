import type { HudModel } from '../../../lib/hud/types';
import { LevelMetaWidget } from '../widgets/LevelMetaWidget';
import { LaserWarningBadge } from '../widgets/LaserWarningBadge';

type Props = {
  model: HudModel;
};

export function HudLeft({ model }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <LevelMetaWidget levelId={model.levelId} />
      <LaserWarningBadge warning={model.laserWarning} />
    </div>
  );
}
