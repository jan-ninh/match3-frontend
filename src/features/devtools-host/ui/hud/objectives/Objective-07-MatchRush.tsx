// src/features/devtools-host/ui/hud/objectives/Objective-07-MatchRush.tsx
import type { HudObjective } from '../../../lib/hud/typesHud';

type ObjectiveMatchRushLike = Extract<HudObjective, { kind: 'matchRush' }>;

type Props = {
  objective: ObjectiveMatchRushLike;
};

export function ObjectiveMatchRush({ objective }: Props) {
  void objective;

  const title = 'Overclock the Grid!';

  return (
    <div
      className={[
        'inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2 mt-4',
        'border-emerald-300/18',
        'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase whitespace-nowrap">Objective</div>
        </div>

        <div className="mt-0.5 text-[15px] font-semibold text-white/90 leading-snug truncate">{title}</div>
      </div>
    </div>
  );
}
