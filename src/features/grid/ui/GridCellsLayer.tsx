import type { Cell } from '@/gamelogic';
import { xyOf } from '@/gamelogic';
import { GAP, TILE_SIZE } from '../lib/constants';

type Props = {
  width: number;
  height: number;
  cells: Cell[];
  onCellPointerDown: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
};

export default function GridCellsLayer({ width, height, cells, onCellPointerDown }: Props) {
  return (
    <div
      className="grid"
      style={{
        gap: `${GAP}px`,
        gridTemplateColumns: `repeat(${width}, ${TILE_SIZE}px)`,
        gridTemplateRows: `repeat(${height}, ${TILE_SIZE}px)`,
      }}
    >
      {cells.map((cell, index) => {
        const blockedOverlayStyle: React.CSSProperties | undefined = cell.blocked
          ? {
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.0) 6px, rgba(255,255,255,0.0) 12px)',
            }
          : undefined;

        const base = [
          'relative rounded-xl border',
          'focus:outline-none',
          'transition-transform duration-150',
          cell.blocked ? 'border-slate-700 bg-slate-900' : 'border-white/10 bg-[#111827]',
          cell.blocked ? '' : 'shadow-sm',
          'hover:scale-[1.02]',
        ].join(' ');

        const { x, y } = xyOf(index, width);

        return (
          <button
            key={index}
            type="button"
            className={base}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              ...(blockedOverlayStyle ?? {}),
            }}
            aria-label={cell.blocked ? `blocked cell ${index}` : `cell ${index}`}
            onPointerDown={(e) => onCellPointerDown(index, e)}
          >
            <div className="absolute top-1 left-1 text-[10px] leading-none text-white/80 drop-shadow">
              {x},{y}
            </div>

            {cell.blocked ? <div className="absolute inset-0 flex items-center justify-center text-white/20 text-2xl">✕</div> : null}
          </button>
        );
      })}
    </div>
  );
}
