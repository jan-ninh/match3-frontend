import type { HudObjective } from '../../../lib/hud/typesHud';

type Props = {
  objective: Extract<HudObjective, { kind: 'laserRowMatch4' }>;
};

export function ObjectiveLaserRowMatch4({ objective }: Props) {
  const remaining = Math.max(0, objective.remaining | 0);
  const target = Math.max(0, objective.target | 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="text-[10px] uppercase tracking-wider text-white/70">Row Laser → Match4+</div>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <div className="text-3xl font-extrabold tabular-nums">{remaining}</div>
        <div className="text-xs text-white/60">/ {target}</div>
      </div>
    </div>
  );
}
