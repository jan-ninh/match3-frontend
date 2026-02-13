import type { Cell } from '@/gamelogic';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { getGridLayoutStyle } from './cells/gridLayoutStyle';
import { buildCellViewModel } from './cells/cellViewModel';
import { GridCell } from './cells/GridCell';
import { CellOverlayRenderer } from './cells/renderers/CellOverlayRenderer';
import { getObstacleSpriteStyles } from './cells/sprites/getObstacleSpriteStyles';

type Props = {
  width: number;
  height: number;
  cells: Cell[];
  onCellPointerDown: (index: number, e: ReactPointerEvent<HTMLButtonElement>) => void;
  showDebugLabels?: boolean;
};

export default function GridCellsLayer({ width, height, cells, onCellPointerDown, showDebugLabels = false }: Props) {
  const sprites = getObstacleSpriteStyles();
  const gridStyle = getGridLayoutStyle(width, height);

  return (
    <div className="grid" style={gridStyle}>
      {cells.map((cell, index) => {
        const vm = buildCellViewModel(cell, index, width);

        return (
          <GridCell
            key={index}
            disabled={cell.blocked}
            ariaLabel={cell.blocked ? `blocked cell ${index}` : `cell ${index}`}
            onPointerDown={(e) => onCellPointerDown(index, e)}
            showDebugLabel={showDebugLabels}
            x={vm.x}
            y={vm.y}
          >
            <CellOverlayRenderer vm={vm} sprites={sprites} />
          </GridCell>
        );
      })}
    </div>
  );
}
