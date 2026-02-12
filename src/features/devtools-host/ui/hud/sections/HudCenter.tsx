import type { HudModel } from '../../../lib/hud/types';
import { ObjectivePanel } from '../objectives/ObjectivePanel';
import { LaserWarningBadge } from '../widgets/LaserWarningBadge';

type Props = {
  model: HudModel;
};

export function HudCenter({ model }: Props) {
  return (
    <div className="min-w-0 flex justify-center">
      <div className="min-w-0 max-w-full relative inline-block">
        {/* soft scrim, so it pops from BG without "more box height" */}
        <div className="pointer-events-none absolute -inset-5 rounded-[26px] bg-black/40 blur-2xl" aria-hidden="true" />

        <div className="min-w-0 max-w-full flex flex-col items-center justify-center gap-2">
          <ObjectivePanel objective={model.objective} />

          {/* Laser warning: directly UNDER the hint (more important/urgent) */}
          <LaserWarningBadge warning={model.laserWarning ?? null} />
        </div>
      </div>
    </div>
  );
}
