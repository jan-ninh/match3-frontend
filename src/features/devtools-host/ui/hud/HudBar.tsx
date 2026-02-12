// src/features/devtools-host/ui/hud/HudBar.tsx
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
      <div
        className={[
          'mx-auto w-full max-w-5xl',
          'rounded-2xl border border-white/10',
          'bg-black/30 backdrop-blur-md',
          'shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
        ].join(' ')}
      >
        <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-3 p-4">
          <HudLeft model={model} />
          <HudCenter model={model} />
          <HudRight model={model} />
        </div>
      </div>
    </div>
  );
}
