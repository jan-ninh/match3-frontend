import type { HudLaserWarning } from '../../../lib/hud/types';
import { formatLaserWarning } from '../../../lib/hud/format';

type Props = {
  warning: HudLaserWarning | null;
};

export function LaserWarningBadge({ warning }: Props) {
  if (!warning) return null;

  return (
    <div
      className={[
        'pointer-events-auto',
        'rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3',
        'backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
      ].join(' ')}
    >
      <div className="text-[11px] uppercase tracking-wide text-amber-200/80">Laser Warning</div>
      <div className="text-sm font-semibold text-amber-100">{formatLaserWarning(warning.kind, warning.index)}</div>
    </div>
  );
}
