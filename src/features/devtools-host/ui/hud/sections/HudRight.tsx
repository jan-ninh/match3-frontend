import type { HudModel } from '../../../lib/hud/typesHud';
import { MovesWidget } from '../widgets/MovesWidget';
import { OutcomeBadge } from '../widgets/OutcomeBadge';
import { SettingsGearButton } from '../widgets/SettingsGearButton';

type Props = {
  model: HudModel;
};

export function HudRight({ model }: Props) {
  return (
    <div className="flex flex-col items-end gap-3">
      <SettingsGearButton iconSrc="/icons/settings-gear.png" />
      <MovesWidget movesLeftText={model.movesLeftText} />
      <OutcomeBadge isWin={model.isWin} isLose={model.isLose} />
    </div>
  );
}
