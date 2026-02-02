import Tile from './Tile';

interface GridBoardProps {
  rows: number;
  cols: number;
  gridData: string[][]; // 2D array of colors for each cell
  onCellClick?: (row: number, col: number) => void; // optional click handler
}

const GridBoard = ({ rows, cols, gridData, onCellClick }: GridBoardProps) => {
  return (
    <div className="flex justify-center">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 64px)`,
          gridTemplateRows: `repeat(${rows}, 64px)`,
          gap: '0px',
        }}
      >
        {gridData.map((row, rowIndex) =>
          row.map((color, colIndex) => <Tile key={`${rowIndex}-${colIndex}`} color={color} onClick={() => onCellClick?.(rowIndex, colIndex)} />),
        )}
      </div>
    </div>
  );
};

export default GridBoard;
