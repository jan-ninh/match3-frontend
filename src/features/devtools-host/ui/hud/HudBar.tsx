import type { HudActions, HudModel } from '../../lib/hud/typesHud';
import { HudLeft } from './sections/HudLeft';
import { HudCenter } from './sections/HudCenter';
import { HudRight } from './sections/HudRight';

type Props = {
  model: HudModel;
  actions: HudActions;
};

export function HudBar({ model, actions }: Props) {
  void actions;

  return (
    <div
      className={[
        // 3-slot layout: left (auto) / center (minmax(0,1fr)) / right (auto)
        'mb-4 w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-start',
        // responsive spacing
        'gap-2 sm:gap-4 px-[clamp(0rem,0.6vw,0.5rem)] ',
      ].join(' ')}
    >
      <HudLeft model={model} />
      <HudCenter model={model} />
      <HudRight model={model} />
    </div>
  );
}
