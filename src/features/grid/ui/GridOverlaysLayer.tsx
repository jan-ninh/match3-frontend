import { TILE_SIZE } from '../lib/constants';

type PxPos = { x: number; y: number };

type Props = {
  selectionPos: PxPos | null;
  targetPos: PxPos | null;

  // Level 04: Laser warning line
  laserWarning?: { kind: 'row' | 'col'; index: number } | null;
  gridWidth?: number;
  gridHeight?: number;
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

function LaserWarningLine({ kind, index, gridWidth, gridHeight }: { kind: 'row' | 'col'; index: number; gridWidth: number; gridHeight: number }) {
  const isRow = kind === 'row';

  // Calculate position and size
  const x = isRow ? 0 : index * TILE_SIZE;
  const y = isRow ? index * TILE_SIZE : 0;
  const width = isRow ? gridWidth * TILE_SIZE : TILE_SIZE;
  const height = isRow ? TILE_SIZE : gridHeight * TILE_SIZE;

  return (
    <div
      className="absolute pointer-events-none animate-pulse"
      style={{
        top: y,
        left: x,
        width,
        height,
        zIndex: 45, // Below pieces but above cells
      }}
    >
      {/* Warning glow */}
      <div
        className="absolute inset-0"
        style={{
          background: isRow
            ? 'linear-gradient(180deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.15) 30%, rgba(239,68,68,0.15) 70%, rgba(239,68,68,0.0) 100%)'
            : 'linear-gradient(90deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.15) 30%, rgba(239,68,68,0.15) 70%, rgba(239,68,68,0.0) 100%)',
          boxShadow: '0 0 20px rgba(239,68,68,0.3)',
        }}
      />

      {/* Scan line effect */}
      <div
        className="absolute"
        style={{
          top: isRow ? '50%' : 0,
          left: isRow ? 0 : '50%',
          width: isRow ? '100%' : 2,
          height: isRow ? 2 : '100%',
          background: 'rgba(239,68,68,0.6)',
          boxShadow: '0 0 8px rgba(239,68,68,0.8), 0 0 16px rgba(239,68,68,0.4)',
          transform: isRow ? 'translateY(-50%)' : 'translateX(-50%)',
        }}
      />

      {/* Edge markers */}
      <div
        className="absolute"
        style={{
          top: isRow ? 0 : -8,
          left: isRow ? -8 : 0,
          width: isRow ? 6 : '100%',
          height: isRow ? '100%' : 6,
          background: 'rgba(239,68,68,0.4)',
          borderRadius: 2,
        }}
      />
      <div
        className="absolute"
        style={{
          top: isRow ? 0 : undefined,
          bottom: isRow ? undefined : -8,
          right: isRow ? -8 : undefined,
          left: isRow ? undefined : 0,
          width: isRow ? 6 : '100%',
          height: isRow ? '100%' : 6,
          background: 'rgba(239,68,68,0.4)',
          borderRadius: 2,
        }}
      />
    </div>
  );
}

export default function GridOverlaysLayer({ selectionPos, targetPos, laserWarning, gridWidth = 8, gridHeight = 8 }: Props) {
  return (
    <>
      {/* Laser Warning Line (Level 04) - render first so it's below other overlays */}
      {laserWarning ? <LaserWarningLine kind={laserWarning.kind} index={laserWarning.index} gridWidth={gridWidth} gridHeight={gridHeight} /> : null}

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
