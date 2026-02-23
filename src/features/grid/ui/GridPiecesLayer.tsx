// src/features/grid/ui/GridPiecesLayer.tsx
// GridPiecesLayer ist absichtlich KEIN Input-Layer
// Es hat pointer-events-none am Root → es kann Pointer-Events gar nicht empfangen.
import { useLayoutEffect, useRef } from 'react';

import type { EnginePhase, Piece, PieceId } from '@/gamelogic';
import type { FallPlan } from '@/gamelogic/types';
import type { Axis } from '@/devtools';
import { cellPixelXY } from '../lib/math';
import { PREVIEW_MS, TILE_SIZE, tileDist, EASING } from '../lib/constants';
import Tile from './Tile';

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
}: Props) {
  const appliedFallTokenRef = useRef<number | null>(null);

  const allowAnim = phase === 'swapAnimating' || phase === 'swapBackAnimating' || phase === 'fallAnimating';

  useLayoutEffect(() => {
    if (phase !== 'fallAnimating') {
      appliedFallTokenRef.current = null;
      return;
    }

    if (swapMs <= 0) return;
    if (!fallPlan || fallPlan.moves.length === 0) return;
    if (fallToken == null) return;

    if (appliedFallTokenRef.current === fallToken) return;
    appliedFallTokenRef.current = fallToken;

    if (typeof window === 'undefined') return;
    if (typeof window.requestAnimationFrame !== 'function') return;

    const touched: HTMLDivElement[] = [];
    const targets = new Map<HTMLDivElement, string>();

    for (const mv of fallPlan.moves) {
      if (dragPieceId === mv.id) continue;

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
          const spawnOffsetY = -(y + 1) * tileDist;
          return `translate(${targetX}px, ${targetY + spawnOffsetY}px)`;
        }
        const fromPos = cellPixelXY(mv.fromIndex, width);
        return `translate(${fromPos.x}px, ${fromPos.y}px)`;
      })();

      const target = `translate(${targetX}px, ${targetY}px)`;

      // Per-piece deterministic delay (engine-owned).
      el.style.transitionDelay = `${mv.delayMs}ms`;

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
        // Prevent delay from leaking into later swap/preview transitions.
        el.style.transitionDelay = '';
      }
    };
  }, [phase, swapMs, fallPlan, fallToken, width, dragPieceId, previewActive, previewOtherPieceId, previewAxis, previewDir]);

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

        const previewMs = swapMs === 0 ? 0 : PREVIEW_MS;
        const transitionForPreviewNeighbor = previewActive && previewOtherPieceId === pp.id ? `transform ${previewMs}ms ${EASING}` : undefined;

        const baseTransition = allowAnim ? `transform ${swapMs}ms ${EASING}` : undefined;
        const outerTransition = applyDragOffset ? 'none' : (transitionForPreviewNeighbor ?? baseTransition);

        const isShaking = shakePieceId === pp.id;

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
              transform: `translate(${basePos.x + previewOffsetX}px, ${basePos.y + previewOffsetY}px)`,
              transition: outerTransition,
              willChange: 'transform',
              zIndex: isThisDragged ? 80 : 20,
            }}
          >
            <Tile type={pp.type} dragging={isThisDragged && isDragging} preview={previewActive && previewOtherPieceId === pp.id} shaking={isShaking} />

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
