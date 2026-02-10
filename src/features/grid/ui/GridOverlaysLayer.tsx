import { TILE_SIZE } from '../lib/constants';

type PxPos = { x: number; y: number };

type Props = {
  selectionPos: PxPos | null;
  targetPos: PxPos | null;
};

function Marker({ strength }: { strength: number }) {
  const washA = 0.13 * strength;
  const washB = 0.11 * strength;

  const borderA = 0.92 * strength;

  const glow1 = 0.55 * strength;
  const glow2 = 0.22 * strength;

  const innerBorderA = 0.14 * strength;
  const innerInsetA = 0.1 * strength;

  return (
    <div className="absolute inset-0 rounded-xl">
      {/* subtle inner wash */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(120% 120% at 30% 22%, rgba(235,205,255,${washA}) 0%, rgba(0,0,0,0) 58%), radial-gradient(140% 140% at 72% 78%, rgba(185,95,255,${washB}) 0%, rgba(0,0,0,0) 62%)`,
        }}
      />

      {/* neon frame + tight glow */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          border: `2px solid rgba(230,205,255,${borderA})`,
          boxShadow: `0 0 6px rgba(185,95,255,${glow1}), 0 0 8px rgba(185,95,255,${glow2})`,
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
          border: `1px solid rgba(255,255,255,${innerBorderA})`,
          boxShadow: `inset 0 0 0 1px rgba(185,95,255,${innerInsetA})`,
        }}
      />
    </div>
  );
}

export default function GridOverlaysLayer({ selectionPos, targetPos }: Props) {
  return (
    <>
      {/* DnD target slot (preview) */}
      {targetPos ? (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: `translate(${targetPos.x}px, ${targetPos.y}px)`,
            zIndex: 59,
          }}
        >
          <Marker strength={0.85} />
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
          <Marker strength={1} />
        </div>
      ) : null}
    </>
  );
}
