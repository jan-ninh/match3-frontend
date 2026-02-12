import type { HudActions, HudModel } from '../../lib/hud/types';
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
    <div className="pointer-events-none w-full px-6 pt-4">
      <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4">
        <HudLeft model={model} />
        <HudCenter model={model} />
        <HudRight model={model} />
      </div>
    </div>
  );
}
