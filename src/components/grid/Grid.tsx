import Tile from './Tile';

type Props = {
  rows: number;
  cols: number;
  gridData: string[][];
  onCellClick?: (row: number, col: number) => void;
};

export default function Grid({ rows, cols, gridData, onCellClick }: Props) {
  return (
    <div className="flex justify-center">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 64px)`,
          gridTemplateRows: `repeat(${rows}, 64px)`,
          gap: '0px'
        }}
      >
        {gridData.map((row, rowIndex) =>
          row.map((color, colIndex) => (
            <Tile key={`${rowIndex}-${colIndex}`} color={color} onClick={() => onCellClick?.(rowIndex, colIndex)} />
          )),
        )}
      </div>
    </div>
  );
}