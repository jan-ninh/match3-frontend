// src/features/grid/ui/matchHints/MatchHintsOverlay.tsx
//
// TERMINOLOGY (SSOT):
// - "Mover" = the PRE-swap tile you take/move (source endpoint).
//   The mover's PIECE ends up in the created match and is CLEARED,
//   but the mover INDEX itself may NOT be in `clearIndices` (post-swap indices).
// - "Anchor" = the POST-swap match slot (destination endpoint) where the match is created.
import { useId, useMemo } from 'react';

import type { PossibleMatchSwap } from '@/gamelogic/match';

import { inferBoardSize, inferPitch } from './geometry';
import { MatchHintsSvg } from './MatchHintsSvg';
import { buildClearHitMap, buildMoverToAnchors, buildSwapDeletedStatusMap, clearHitsSortedFromMap, maxMapValue, toSwapDots } from './model';
import { ARROW, COLORS, DOT_R, makeMatchHintsDefs } from './stylesSvg';

type Props = {
  swaps: readonly PossibleMatchSwap[];
  width: number;
  height: number;
  zIndex?: number;
};

export default function MatchHintsOverlay({ swaps, width, height, zIndex = 80 }: Props) {
  const pitch = useMemo(() => inferPitch(width, height), [width, height]);
  const boardSize = useMemo(() => inferBoardSize(width, height, pitch), [width, height, pitch]);

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const defs = useMemo(() => makeMatchHintsDefs(uid, COLORS), [uid]);

  // Tile overlay: heatmap intensity by "how many swaps would clear this slot".
  const clearHitMap = useMemo(() => buildClearHitMap(swaps), [swaps]);
  const maxHits = useMemo(() => maxMapValue(clearHitMap), [clearHitMap]);
  const clearHitsSorted = useMemo(() => clearHitsSortedFromMap(clearHitMap), [clearHitMap]);

  // Swap dots:
  // - deleted-dot is not rendered
  // - non-deleted-dot is rendered as RED (per current visual language)
  const swapDeletedStatus = useMemo(() => buildSwapDeletedStatusMap(swaps), [swaps]);
  const swapDots = useMemo(() => toSwapDots(swapDeletedStatus), [swapDeletedStatus]);

  // Arrows:
  // - from Mover-center -> Anchor-center
  // - multiple anchors per mover allowed
  const moverToAnchors = useMemo(() => buildMoverToAnchors(swaps), [swaps]);

  const inset = 2;

  // Force “over everything” feel.
  const effectiveZ = Math.max(zIndex, 1000);

  return (
    <div className="absolute left-0 top-0 pointer-events-none select-none" style={{ zIndex: effectiveZ }}>
      <MatchHintsSvg
        width={width}
        height={height}
        pitch={pitch}
        boardSize={boardSize}
        inset={inset}
        colors={COLORS}
        defsJsx={defs.defsJsx}
        defIds={defs.ids}
        dotR={DOT_R}
        arrow={ARROW}
        clearHitsSorted={clearHitsSorted}
        maxHits={maxHits}
        moverToAnchors={moverToAnchors}
        swapDots={swapDots}
      />
    </div>
  );
}
