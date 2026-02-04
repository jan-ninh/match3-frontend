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
          <div className="absolute inset-0 rounded-xl ring-4 ring-white/20 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.12)]" />
        </div>
      ) : null}

      {/* Selected overlay */}
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
          <div className="absolute inset-0 rounded-xl ring-4 ring-white/30 border border-white/40" />
        </div>
      ) : null}
    </>
  );
}
