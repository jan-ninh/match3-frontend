import type { CSSProperties } from 'react';
import type { HudObjective } from '@/features/gameplay/lib/hud/typesHud';
import { getTileSprite } from '@/features/grid/ui/tiles';

type ObjectiveCollectLike = Extract<HudObjective, { kind: 'collect' }>;

type Props = {
  objective: ObjectiveCollectLike;
};

function labelForPieceType(pieceType: string): string {
  if (!pieceType) return 'Data';
  return pieceType.charAt(0).toUpperCase() + pieceType.slice(1);
}

function getCollectCopy(pieceType: string): { title: string; hint: string } {
  switch (pieceType) {
    case 'cyan':
      return {
        title: 'Collect Energy Crystals',
        hint: 'Match 3 or more crystals to collect them.',
      };
    case 'purple':
      return {
        title: 'Collect Data Chips',
        hint: 'Match 3 or more data chips to collect them.',
      };
    default: {
      const label = labelForPieceType(pieceType);
      return {
        title: `Collect ${label} Data`,
        hint: `Match 3 or more ${label.toLowerCase()} tiles to collect them.`,
      };
    }
  }
}

export function ObjectiveCollect({ objective }: Props) {
  const copy = getCollectCopy(objective.pieceType);
  const done = Math.max(0, objective.count | 0);
  const total = Math.max(0, objective.target | 0);

  const sprite = objective.pieceType ? getTileSprite(objective.pieceType as never) : null;
  const iconSize = 26;
  const iconScale = sprite ? iconSize / sprite.w : 1;
  const iconStyle: CSSProperties | undefined = sprite
    ? {
        width: iconSize,
        height: iconSize,
        backgroundImage: `url(${sprite.sheet})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${sprite.sheetW * iconScale}px ${sprite.sheetH * iconScale}px`,
        backgroundPosition: `${-sprite.x * iconScale}px ${-sprite.y * iconScale}px`,
      }
    : undefined;

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
            <span className="truncate">{copy.title}</span>
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 shrink-0" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-1.5 font-mono text-sm text-cyan-100/90 tabular-nums whitespace-nowrap">
          {iconStyle && <span aria-hidden="true" className="block shrink-0" style={iconStyle} />}
          <span>{done}/{total}</span>
        </div>
      </div>

      <div className="objective-description inline-flex min-w-0 items-center rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
        <div className="text-xs text-white/55">{copy.hint}</div>
      </div>
    </>
  );
}
