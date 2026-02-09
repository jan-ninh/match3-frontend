import { TILE_SIZE } from '../lib/constants';

type PxPos = { x: number; y: number };

type Props = {
  selectionPos: PxPos | null;
  overPos: PxPos | null;
};

export default function GridOverlaysLayer({ selectionPos, overPos }: Props) {
  return (
    <>
      {/* Drag overIndex highlight */}
      {overPos ? (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: `translate(${overPos.x}px, ${overPos.y}px)`,
            zIndex: 58,
          }}
        >
          <div className="absolute inset-0 rounded-xl ring-4 ring-white/20 border border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.10)]" />
        </div>
      ) : null}

      {/* Selected overlay (tight glow like ref tile #5) */}
      {selectionPos ? (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: `translate(${selectionPos.x}px, ${selectionPos.y}px)`,
            zIndex: 60,
          }}
        >
          <div className="absolute inset-0 rounded-xl">
            {/* subtle inner wash */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background:
                  'radial-gradient(120% 120% at 30% 22%, rgba(235,205,255,0.13) 0%, rgba(0,0,0,0) 58%), radial-gradient(140% 140% at 72% 78%, rgba(185,95,255,0.11) 0%, rgba(0,0,0,0) 62%)',
              }}
            />

            {/* neon frame + tight glow (no wide bleed) */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                border: '2px solid rgba(230,205,255,0.92)',
                boxShadow: '0 0 6px rgba(185,95,255,0.55), 0 0 8px rgba(185,95,255,0.22)',
              }}
            />

            {/* inner fine stroke */}
            <div
              className="absolute"
              style={{
                top: 3,
                left: 3,
                right: 3,
                bottom: 3,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: 'inset 0 0 0 1px rgba(185,95,255,0.10)',
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
