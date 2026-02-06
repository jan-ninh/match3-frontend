import { useLayoutEffect, useRef, useState } from 'react';

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
  const prevCellIndexByIdRef = useRef<Map<number, number>>(new Map());
  const [, bumpSpawnNonce] = useState(0);

  const allowAnim = phase === 'swapAnimating' || phase === 'swapBackAnimating' || phase === 'fallAnimating';
  const spawnEnabled = phase === 'fallAnimating' && swapMs > 0;

  useLayoutEffect(() => {
    const prev = prevCellIndexByIdRef.current;

    let hasNewSpawn = false;
    if (spawnEnabled) {
      for (const pp of pieces) {
        if (!prev.has(pp.id)) {
          hasNewSpawn = true;
          break;
        }
      }
    }

    const next = new Map<number, number>();
    for (const pp of pieces) next.set(pp.id, pp.cellIndex);
    prevCellIndexByIdRef.current = next;

    if (!hasNewSpawn) return;
    if (typeof window === 'undefined') return;
    if (typeof window.requestAnimationFrame !== 'function') return;

    const raf = window.requestAnimationFrame(() => {
      bumpSpawnNonce((v) => (v + 1) | 0);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [pieces, spawnEnabled]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pieces.map((pp) => {
        const basePos = cellPixelXY(pp.cellIndex, width);

        const prevCellIndex = prevCellIndexByIdRef.current.get(pp.id);
        const isNewPiece = prevCellIndex === undefined;

        let spawnOffsetY = 0;
        if (spawnEnabled && isNewPiece) {
          const y = Math.floor(pp.cellIndex / width);
          spawnOffsetY = -(y + 1) * tileDist;
        }

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
              transform: `translate(${basePos.x + previewOffsetX}px, ${basePos.y + previewOffsetY + spawnOffsetY}px)`,
              transition: outerTransition,
              willChange: 'transform',
              zIndex: isThisDragged ? 80 : 20,
            }}
          >
            <Tile type={pp.type} dragging={isThisDragged && isDragging} preview={previewActive && previewOtherPieceId === pp.id} shaking={isShaking} />

            {showDebugLabels ? <div className="absolute bottom-1 right-1 text-[10px] leading-none text-white/85 drop-shadow font-mono">#{pp.id} {pp.type}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

