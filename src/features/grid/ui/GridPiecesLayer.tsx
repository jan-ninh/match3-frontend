// src\features\grid\ui\GridPiecesLayer.tsx
// GridPiecesLayer ist absichtlich KEIN Input-Layer
// Es hat pointer-events-none am Root → es kann Pointer-Events gar nicht empfangen.
import { useLayoutEffect, useRef } from 'react';

import type { EnginePhase, Piece, PieceId } from '@/gamelogic';
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
  previewActive,
  previewOtherPieceId,
  previewAxis,
  previewDir,
  shakePieceId,
  showDebugLabels = false,
  setDraggedEl,
}: Props) {
  const prevIdsRef = useRef<Set<PieceId>>(new Set());

  const allowAnim = phase === 'swapAnimating' || phase === 'swapBackAnimating' || phase === 'fallAnimating';
  const spawnEnabled = phase === 'fallAnimating' && swapMs > 0;

  useLayoutEffect(() => {
    const prevIds = prevIdsRef.current;

    const nextIds = new Set<PieceId>();
    const newPieces: Piece[] = [];

    for (const pp of pieces) {
      nextIds.add(pp.id);
      if (spawnEnabled && !prevIds.has(pp.id)) newPieces.push(pp);
    }

    prevIdsRef.current = nextIds;

    if (!spawnEnabled || newPieces.length === 0) return;
    if (typeof window === 'undefined') return;
    if (typeof window.requestAnimationFrame !== 'function') return;

    const rafs: number[] = [];

    for (const pp of newPieces) {
      // Never override the actively dragged piece
      if (dragPieceId === pp.id) continue;

      const el = document.querySelector<HTMLDivElement>(`[data-piece-id="${pp.id}"]`);
      if (!el) continue;

      const basePos = cellPixelXY(pp.cellIndex, width);

      let previewOffsetX = 0;
      let previewOffsetY = 0;

      if (previewActive && previewOtherPieceId === pp.id && previewAxis && previewDir !== 0) {
        if (previewAxis === 'x') previewOffsetX = -previewDir * tileDist;
        else previewOffsetY = -previewDir * tileDist;
      }

      const y = Math.floor(pp.cellIndex / width);
      const spawnOffsetY = -(y + 1) * tileDist;

      const targetX = basePos.x + previewOffsetX;
      const targetY = basePos.y + previewOffsetY;

      const start = `translate(${targetX}px, ${targetY + spawnOffsetY}px)`;
      const target = `translate(${targetX}px, ${targetY}px)`;

      // Set start position before paint, then animate to target next frame.
      el.style.transform = start;
      void el.offsetHeight;

      const raf = window.requestAnimationFrame(() => {
        el.style.transform = target;
      });
      rafs.push(raf);
    }

    return () => {
      for (const id of rafs) window.cancelAnimationFrame(id);
    };
  }, [pieces, spawnEnabled, width, dragPieceId, previewActive, previewOtherPieceId, previewAxis, previewDir]);

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
