import type { HudObjective } from '@/features/gameplay/lib/hud/typesHud';

type ObjectiveCollectLike = Extract<HudObjective, { kind: 'collect' }>;

type Props = {
  objective: ObjectiveCollectLike;
};

function labelForPieceType(pieceType: string): string {
  if (!pieceType) return 'Data';
  return pieceType.charAt(0).toUpperCase() + pieceType.slice(1);
}

export function ObjectiveCollect({ objective }: Props) {
  const label = labelForPieceType(objective.pieceType);
  const done = Math.max(0, objective.count | 0);
  const total = Math.max(0, objective.target | 0);

  return (
    <>
      <div
        className={[
          'objective-title inline-flex min-w-0 max-w-full items-center gap-4 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2 mt-4',
          'border-cyan-300/20 shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(34,211,238,0.12)]',
        ].join(' ')}
      >
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase whitespace-nowrap">Objective</div>
          <div className="mt-0.5 flex items-center gap-2 text-[15px] font-semibold text-white/90 leading-snug">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.65)]" aria-hidden="true" />
            <span className="truncate">Collect {label} Data</span>
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 shrink-0" aria-hidden="true" />

        <div className="font-mono text-sm text-cyan-100/90 tabular-nums whitespace-nowrap">
          {done}/{total}
        </div>
      </div>

      <div className="objective-description inline-flex min-w-0 items-center rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
        <div className="text-xs text-white/55">Match cyan tiles to collect them.</div>
      </div>
    </>
  );
}