import type { Cell } from '@/gamelogic';
import { xyOf } from '@/gamelogic';
import { GAP, TILE_SIZE } from '../lib/constants';
import { getGateSprite, getSpecialTileSprite, specialTile_04 } from './tiles-special';

type Props = {
  width: number;
  height: number;
  cells: Cell[];
  onCellPointerDown: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  showDebugLabels?: boolean;
};

export default function GridCellsLayer({ width, height, cells, onCellPointerDown, showDebugLabels = false }: Props) {
  // blocked cells use piece_04.png (special tileset basic b-04)
  const blockedSprite = getSpecialTileSprite(specialTile_04);

  const blockedSpriteStyleBase: React.CSSProperties | undefined = blockedSprite
    ? (() => {
        const scale = TILE_SIZE / blockedSprite.w;
        return {
          backgroundImage: `url(${blockedSprite.sheet})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${blockedSprite.sheetW * scale}px ${blockedSprite.sheetH * scale}px`,
          backgroundPosition: `${-blockedSprite.x * scale}px ${-blockedSprite.y * scale}px`,
        };
      })()
    : undefined;

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
        const isGate = cell.obstacle === 'gate';
        const isFirewall = cell.obstacle === 'firewall';
        const isBlockedPlain = cell.blocked && !isGate && !isFirewall;

        const { x, y } = xyOf(index, width);

        const gateSprite = isGate ? getGateSprite(!!cell.gateOpen) : null;

        const gateSpriteStyle: React.CSSProperties | undefined = gateSprite
          ? (() => {
              const scale = TILE_SIZE / gateSprite.w;
              return {
                backgroundImage: `url(${gateSprite.sheet})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${gateSprite.sheetW * scale}px ${gateSprite.sheetH * scale}px`,
                backgroundPosition: `${-gateSprite.x * scale}px ${-gateSprite.y * scale}px`,
              };
            })()
          : undefined;

        const base = [
          'relative rounded-xl border border-slate-500/5 bg-transparent focus:outline-none',
          cell.blocked ? 'cursor-not-allowed' : 'cursor-pointer shadow-sm',
        ].join(' ');

        return (
          <button
            key={index}
            type="button"
            className={base}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
            disabled={cell.blocked}
            aria-label={cell.blocked ? `blocked cell ${index}` : `cell ${index}`}
            onPointerDown={(e) => onCellPointerDown(index, e)}
          >
            {showDebugLabels ? (
              <div className="absolute top-1 left-1 text-[10px] leading-none text-white/80 drop-shadow">
                {x},{y}
              </div>
            ) : null}

            {isGate ? (
              <>
                <div className="absolute inset-0 rounded-xl opacity-90" style={gateSpriteStyle} />
                <div
                  className={[
                    'absolute inset-2 rounded-lg border border-white/10',
                    cell.gateOpen ? 'bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.18)]' : 'bg-fuchsia-500/10 shadow-[0_0_18px_rgba(217,70,239,0.18)]',
                  ].join(' ')}
                />
              </>
            ) : isFirewall ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
                <div className="absolute inset-0 rounded-xl border border-cyan-300/20 shadow-[0_0_18px_rgba(34,211,238,0.18)]" />
                <div className="absolute inset-2 rounded-lg bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.18)]" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-cyan-300/20 border border-cyan-200/20 shadow-[0_0_14px_rgba(34,211,238,0.25)]" />
                </div>

                {typeof cell.hp === 'number' && typeof cell.maxHp === 'number' ? (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                    {Array.from({ length: Math.min(3, cell.maxHp) }, (_, i) => {
                      const on = i < (cell.hp ?? 0);
                      return (
                        <div
                          key={i}
                          className={[
                            'h-1.5 w-4 rounded-full border',
                            on ? 'bg-cyan-400/55 border-cyan-200/35 shadow-[0_0_10px_rgba(34,211,238,0.18)]' : 'bg-white/5 border-white/15',
                          ].join(' ')}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : isBlockedPlain && blockedSpriteStyleBase ? (
              <div className="absolute inset-0 rounded-xl opacity-95" style={blockedSpriteStyleBase} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
