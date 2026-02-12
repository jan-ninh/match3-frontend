// src/features/devtools-host/ui/hud/widgets/LaserWarningBadge.tsx
import type { HudLaserWarning } from '../../../lib/hud/types';
import { formatLaserWarning } from '../../../lib/hud/format';

type Props = {
  warning: HudLaserWarning | null;
};

export function LaserWarningBadge({ warning }: Props) {
  if (!warning) return null;

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-amber-200/80">Laser warning</div>
      <div className="text-sm font-semibold text-amber-100">{formatLaserWarning(warning.kind, warning.index)}</div>
    </div>
  );
}
