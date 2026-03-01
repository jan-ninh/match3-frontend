// src/features/gameplay/ui/hud/objectives/Objective-09-LaserRowMatch4.tsx
import type { HudObjective } from '@/features/gameplay/lib/hud/typesHud';

type Props = {
  objective: Extract<HudObjective, { kind: 'laserRowMatch4' }>;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

export function ObjectiveLaserRowMatch4({ objective }: Props) {
  // Engine currently stores a countdown ("remaining").
  // UI now shows progress ("done") as 0/target … target/target.
  const remaining = Math.max(0, objective.remaining | 0);
  const target = Math.max(0, objective.target | 0);

  const done = target > 0 ? clampInt(target - remaining, 0, target) : 0;

  // Objective: Row Laser → Match4+
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="text-3md font-bold uppercase tracking-wider text-white/100">Match4+</div>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <div className="text-xs text-white/60">{done}</div>
        <div className="text-3md font-extrabold tabular-nums">/ {target}</div>
      </div>
    </div>
  );
}
