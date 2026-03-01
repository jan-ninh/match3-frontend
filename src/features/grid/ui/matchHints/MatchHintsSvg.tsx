import type { ReactElement } from 'react';

import { cellCenter, cellTopLeft, type Pitch, type SizePx } from './geometry';
import { arrowPolygon } from './geometry';
import type { ClearHit, MatchTier, MoverAnchor, SwapDot } from './model';
import type { MatchHintsColors, MatchHintsDefIds } from './stylesSvg';

type Props = {
  width: number;
  height: number;
  pitch: Pitch;
  boardSize: SizePx;

  inset: number;

  colors: MatchHintsColors;
  defsJsx: ReactElement;
  defIds: MatchHintsDefIds;

  // style knobs
  dotR: number;
  arrow: Readonly<{
    bodyWidth: number;
    headLength: number;
    headWidth: number;
    outlineExtra: number;
    outlineHeadLengthExtra: number;
    outlineHeadWidthExtra: number;
  }>;

  clearHitsSorted: readonly ClearHit[];
  maxHits: number;

  moverToAnchors: readonly MoverAnchor[];
  swapDots: readonly SwapDot[];
};

export function MatchHintsSvg({
  width,
  height,
  pitch,
  boardSize,
  inset,
  colors,
  defsJsx,
  defIds,
  dotR,
  arrow,
  clearHitsSorted,
  maxHits,
  moverToAnchors,
  swapDots,
}: Props) {
  void height;
  const TileHeatLayer = () => (
    <>
      {clearHitsSorted.map(({ idx, hits }) => {
        const tl = cellTopLeft(idx, width);
        const intensity = clamp01(hits / Math.max(1, maxHits));

        const fillOpacity = 0.12 + intensity * 0.22; // 0.12..0.34
        const strokeOpacity = 0.18 + intensity * 0.22; // 0.18..0.40

        const x = tl.x + inset;
        const y = tl.y + inset;
        const w = Math.max(1, pitch.w - inset * 2);
        const h = Math.max(1, pitch.h - inset * 2);

        return (
          <rect
            key={`mh-clear-${idx}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={8}
            ry={8}
            fill={colors.tileOverlay}
            fillOpacity={fillOpacity}
            stroke={colors.tileOverlay}
            strokeOpacity={strokeOpacity}
            strokeWidth={2}
            filter={`url(#${defIds.tileGlowId})`}
          />
        );
      })}
    </>
  );

  const arrowVisualsForTier = (tier: MatchTier): Readonly<{ fill: string; filterId: string }> => {
    switch (tier) {
      case 'm5p':
        return { fill: colors.red, filterId: defIds.redGlowId };
      case 'm4':
        return { fill: colors.yellow, filterId: defIds.yellowGlowId };
      case 'm3':
        return { fill: colors.blue, filterId: defIds.glowId };
    }
  };

  const MoverArrowLayer = () => (
    <>
      {moverToAnchors.map(({ mover, anchor, tier }) => {
        const from = cellCenter(mover, width, pitch);
        const to = cellCenter(anchor, width, pitch);

        const core = arrowPolygon(from, to, {
          startTrim: 0,
          endTrim: 0,
          bodyWidth: arrow.bodyWidth,
          headLength: arrow.headLength,
          headWidth: arrow.headWidth,
        });

        const outline = arrowPolygon(from, to, {
          startTrim: 0,
          endTrim: 0,
          bodyWidth: arrow.bodyWidth + arrow.outlineExtra,
          headLength: arrow.headLength + arrow.outlineHeadLengthExtra,
          headWidth: arrow.headWidth + arrow.outlineHeadWidthExtra,
        });

        const vis = arrowVisualsForTier(tier);

        return (
          <g key={`mh-m2a-${mover}-${anchor}`}>
            <polygon points={outline.points} fill={colors.black} fillOpacity={0.1} />
            <polygon points={core.points} fill={vis.fill} filter={`url(#${vis.filterId})`} />
          </g>
        );
      })}
    </>
  );

  const SwapDotLayer = () => (
    <>
      {swapDots.map(({ idx, deleted }) => {
        if (deleted) return null;
        const c = cellCenter(idx, width, pitch);
        return <circle key={`mh-swapdot-${idx}`} cx={c.x} cy={c.y} r={dotR} fill={colors.red} filter={`url(#${defIds.redGlowId})`} />;
      })}
    </>
  );

  return (
    <svg
      width={boardSize.w}
      height={boardSize.h}
      viewBox={`0 0 ${boardSize.w} ${boardSize.h}`}
      className="absolute left-0 top-0"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      {defsJsx}
      <TileHeatLayer />
      <MoverArrowLayer />
      <SwapDotLayer />
    </svg>
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
