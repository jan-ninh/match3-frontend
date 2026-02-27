// GridPiecesLayer ist absichtlich KEIN Input-Layer
// Es hat pointer-events-none am Root → es kann Pointer-Events gar nicht empfangen.
import { useLayoutEffect, useMemo, useRef } from 'react';

import type { EnginePhase, Piece, PieceId } from '@/gamelogic';
import type { FallPlan } from '@/gamelogic/types';
import { FALLING_TUNING, computeEffectiveFallDurationMs, computeFallMoveDurationMs } from '@/gamelogic/engine/fallingTuning';
import type { Axis } from '@/devtools';
import { cellPixelXY } from '../lib/math';
import { PREVIEW_MS, TILE_SIZE, tileDist, EASING } from '../lib/constants';
import Tile from './Tile';
import type { HintNudge } from './matchHints/useAutoMatchHints';

type Props = {
  width: number;
  pieces: Piece[];
  dragPieceId: PieceId | null;
  isDragging: boolean;
  phase: EnginePhase;

  swapMs: number;

  // True-fall payload (engine-owned)
  fallPlan: FallPlan | null;
  fallToken: number | null;

  previewActive: boolean;
  previewOtherPieceId: PieceId | null;
  previewAxis: Axis | null;
  previewDir: -1 | 0 | 1;

  shakePieceId: PieceId | null;
  showDebugLabels?: boolean;

  setDraggedEl: (el: HTMLDivElement | null, basePos: { x: number; y: number }) => void;

  // Auto Match Hint FX (UI-only)
  hintBlinkActive?: boolean;
  hintBlinkPieceIds?: readonly PieceId[];
  hintNudge?: HintNudge | null;
};

export default function GridPiecesLayer({
  width,
  pieces,
  dragPieceId,
  isDragging,
  phase,
  swapMs,
  fallPlan,
  fallToken,
  previewActive,
  previewOtherPieceId,
  previewAxis,
  previewDir,
  shakePieceId,
  showDebugLabels = false,
  setDraggedEl,
  hintBlinkActive = false,
  hintBlinkPieceIds = [],
  hintNudge = null,
}: Props) {
  const appliedFallTokenRef = useRef<number | null>(null);

  const blinkSet = useMemo(() => new Set<PieceId>(hintBlinkPieceIds), [hintBlinkPieceIds]);

  const allowAnim = phase === 'swapAnimating' || phase === 'swapBackAnimating' || phase === 'fallAnimating';

  const fallDurationMs = computeEffectiveFallDurationMs(swapMs, FALLING_TUNING.fall.baseDurationMs);
  const fallEasing = FALLING_TUNING.fall.easing;

  const spawnedSet = useMemo(() => {
    const set = new Set<PieceId>();
    if (phase !== 'fallAnimating') return set;
    if (!fallPlan || fallPlan.moves.length === 0) return set;
    for (const mv of fallPlan.moves) {
      if (mv.fromIndex === null) set.add(mv.id);
    }
    return set;
  }, [phase, fallPlan]);

  useLayoutEffect(() => {
    if (phase !== 'fallAnimating') {
      appliedFallTokenRef.current = null;
      return;
    }

    // reduced motion => no anims
    if (swapMs <= 0) return;

    if (!fallPlan || fallPlan.moves.length === 0) return;
    if (fallToken == null) return;

    if (appliedFallTokenRef.current === fallToken) return;
    appliedFallTokenRef.current = fallToken;

    if (typeof window === 'undefined') return;
    if (typeof window.requestAnimationFrame !== 'function') return;

    const typeById = new Map<PieceId, Piece['type']>();
    for (const p of pieces) typeById.set(p.id, p.type);

    const touched: HTMLDivElement[] = [];
    const targets = new Map<HTMLDivElement, string>();

    for (const mv of fallPlan.moves) {
      if (dragPieceId === mv.id) continue;

      // Keycard special: "instant spawn" (do NOT start above and fall).
      // It will still pop via CSS class on <Tile /> (see render below).
      if (mv.fromIndex === null && typeById.get(mv.id) === 'keycard') {
        continue;
      }

      const el = document.querySelector<HTMLDivElement>(`[data-piece-id="${mv.id}"]`);
      if (!el) continue;

      let previewOffsetX = 0;
      let previewOffsetY = 0;

      // Defensive: keep target consistent with render-time transform if preview is somehow still active.
      if (previewActive && previewOtherPieceId === mv.id && previewAxis && previewDir !== 0) {
        if (previewAxis === 'x') previewOffsetX = -previewDir * tileDist;
        else previewOffsetY = -previewDir * tileDist;
      }

      const targetPos = cellPixelXY(mv.toIndex, width);
      const targetX = targetPos.x + previewOffsetX;
      const targetY = targetPos.y + previewOffsetY;

      const start = (() => {
        if (mv.fromIndex === null) {
          const y = Math.floor(mv.toIndex / width);
          const extraRows = FALLING_TUNING.spawn.extraRowsAbove;
          const hFactor = FALLING_TUNING.spawn.heightFactor;
          const spawnOffsetY = -((y + extraRows) * tileDist * hFactor);
          return `translate(${targetX}px, ${targetY + spawnOffsetY}px)`;
        }
        const fromPos = cellPixelXY(mv.fromIndex, width);
        return `translate(${fromPos.x}px, ${fromPos.y}px)`;
      })();

      const target = `translate(${targetX}px, ${targetY}px)`;

      // Constant-speed: per-move duration derived from distance.
      const moveMsRaw = computeFallMoveDurationMs(swapMs, mv.fromIndex, mv.toIndex, width);
      const moveMs = moveMsRaw > 0 ? moveMsRaw : fallDurationMs;

      // Apply per-move transition; will be reset in cleanup to avoid leaking into swaps/previews.
      el.style.transition = `transform ${moveMs}ms ${fallEasing}`;

      // Engine jitter (mv.delayMs) + global hole delay + spawn stacking delay (bottom-first).
      const holeDelayMs = FALLING_TUNING.holeDelayMs;
      const stackDelayMs = mv.spawnStackDelayMs ?? 0;

      // Ensure spawned stacks cannot "invert" due to jitter.
      // If msPerRow is enabled, keep jitter within a single row-step.
      const msPerRow = FALLING_TUNING.fall.msPerRow | 0;
      const jitterMs = mv.delayMs | 0;
      const jitterSafeMs = msPerRow > 0 ? ((jitterMs % msPerRow) + msPerRow) % msPerRow : jitterMs;

      el.style.transitionDelay = `${holeDelayMs + stackDelayMs + jitterSafeMs}ms`;

      // Set start position before paint, then animate to target next frame.
      el.style.transform = start;

      touched.push(el);
      targets.set(el, target);
    }

    // Force reflow once, then apply targets next frame.
    if (touched.length === 0) return;

    void touched[0].offsetHeight;

    const raf = window.requestAnimationFrame(() => {
      for (const el of touched) {
        const t = targets.get(el);
        if (t) el.style.transform = t;
      }
    });

    return () => {
      window.cancelAnimationFrame(raf);
      for (const el of touched) {
        // Prevent per-move config from leaking into later swap/preview transitions.
        el.style.transitionDelay = '';
        el.style.transition = '';
      }
    };
  }, [
    phase,
    swapMs,
    fallPlan,
    fallToken,
    width,
    dragPieceId,
    previewActive,
    previewOtherPieceId,
    previewAxis,
    previewDir,
    fallDurationMs,
    fallEasing,
    pieces,
  ]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pieces.map((pp) => {
        const basePos = cellPixelXY(pp.cellIndex, width);

        const isThisDragged = dragPieceId === pp.id;
        const applyDragOffset = isThisDragged && isDragging;

        let previewOffsetX = 0;
        let previewOffsetY = 0;

        if (previewActive && previewOtherPieceId === pp.id && previewAxis && previewDir !== 0) {
          if (previewAxis === 'x') previewOffsetX = -previewDir * tileDist;
          else previewOffsetY = -previewDir * tileDist;
        }

        const hintDx = hintNudge && hintNudge.pieceId === pp.id ? hintNudge.dx : 0;
        const hintDy = hintNudge && hintNudge.pieceId === pp.id ? hintNudge.dy : 0;

        const previewMs = swapMs === 0 ? 0 : PREVIEW_MS;
        const transitionForPreviewNeighbor = previewActive && previewOtherPieceId === pp.id ? `transform ${previewMs}ms ${EASING}` : undefined;

        const baseMs = phase === 'fallAnimating' ? fallDurationMs : swapMs;
        const baseEasing = phase === 'fallAnimating' ? fallEasing : EASING;
        const baseTransition = allowAnim ? `transform ${baseMs}ms ${baseEasing}` : undefined;

        const hintTransition =
          hintNudge && hintNudge.pieceId === pp.id && !applyDragOffset ? `transform ${hintNudge.transitionMs}ms ${EASING}` : undefined;

        const outerTransition = applyDragOffset ? 'none' : (hintTransition ?? transitionForPreviewNeighbor ?? baseTransition);

        const isShaking = shakePieceId === pp.id;

        const hintBlink = hintBlinkActive && blinkSet.has(pp.id);

        const spawnPop = pp.type === 'keycard' && spawnedSet.has(pp.id);

        return (
          <div
            key={pp.id}
            data-piece-id={pp.id}
            ref={
              isThisDragged
                ? (el) => {
                    if (el) setDraggedEl(el, basePos);
                    else setDraggedEl(null, basePos);
                  }
                : undefined
            }
            className="absolute"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              transform: `translate(${basePos.x + previewOffsetX + hintDx}px, ${basePos.y + previewOffsetY + hintDy}px)`,
              transition: outerTransition,
              willChange: 'transform',
              zIndex: isThisDragged ? 80 : 20,
            }}
          >
            <Tile
              type={pp.type}
              dragging={isThisDragged && isDragging}
              preview={previewActive && previewOtherPieceId === pp.id}
              shaking={isShaking}
              hintBlink={hintBlink}
              spawnPop={spawnPop}
            />

            {showDebugLabels ? (
              <div className="absolute bottom-1 right-1 text-[10px] leading-none text-white/85 drop-shadow font-mono">
                #{pp.id} {pp.type}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
