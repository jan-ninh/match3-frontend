import type { HudModel } from '../../../lib/hud/types-hud';
import { LevelMetaWidget } from '../widgets/LevelMetaWidget';

type Props = {
  model: HudModel;
};

export function HudLeft({ model }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <LevelMetaWidget levelId={model.levelId} />
    </div>
  );
}
