import type { Piece, PieceId } from '@/gamelogic';
import type { Axis } from '@/devtools';
import { cellPixelXY } from '../lib/math';
import { PREVIEW_MS, SWAP_MS, TILE_SIZE, tileDist, EASING } from '../lib/constants';
import Tile from './Tile';

type Props = {
  width: number;
  pieces: Piece[];
  dragPieceId: PieceId | null;
  isDragging: boolean;

  previewActive: boolean;
  previewOtherPieceId: PieceId | null;
  previewAxis: Axis | null;
  previewDir: -1 | 0 | 1;

  shakePieceId: PieceId | null;

  setDraggedEl: (el: HTMLDivElement | null, basePos: { x: number; y: number }) => void;
};
export default function GridPiecesLayer({
  width,
  pieces,
  dragPieceId,
  isDragging,
  previewActive,
  previewOtherPieceId,
  previewAxis,
  previewDir,
  shakePieceId,
  setDraggedEl,
}: Props) {
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

        const transitionForPreviewNeighbor = previewActive && previewOtherPieceId === pp.id ? `transform ${PREVIEW_MS}ms ${EASING}` : undefined;

        const outerTransition = applyDragOffset ? 'none' : (transitionForPreviewNeighbor ?? `transform ${SWAP_MS}ms ${EASING}`);

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
              transform: `translate(${basePos.x + previewOffsetX}px, ${basePos.y + previewOffsetY}px)`,
              transition: outerTransition,
              willChange: 'transform',
              zIndex: isThisDragged ? 80 : 20,
            }}
          >
            <Tile type={pp.type} dragging={isThisDragged && isDragging} preview={previewActive && previewOtherPieceId === pp.id} shaking={isShaking} />

            <div className="absolute bottom-1 right-1 text-[10px] leading-none text-white/85 drop-shadow font-mono">#{pp.id}</div>
          </div>
        );
      })}
    </div>
  );
}
