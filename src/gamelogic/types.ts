export type LevelId = number;

export type PieceType = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type PieceId = number;

export type Cell = {
  blocked: boolean;
  pieceId: PieceId | null;
};

export type Piece = {
  id: PieceId;
  type: PieceType;

  // where this piece currently sits (so UI can animate by moving entities)
  cellIndex: number;
};

export type LevelDefinition = {
  id: LevelId;
  width: number;
  height: number;

  blockedIndices: number[];
  allowedTypes: PieceType[];

  baseSeed: number;
};

export type SwapRejectReason = 'notAdjacent' | 'blocked' | 'empty';

export type EngineEvent =
  | { type: 'seededInit'; levelId: LevelId; width: number; height: number; seed: number }
  | { type: 'select'; index: number }
  | { type: 'selectionCleared' }
  | { type: 'swap'; from: number; to: number }
  | { type: 'swapRejected'; from: number; to: number; reason: SwapRejectReason };

export type EngineState = {
  levelId: LevelId;
  width: number;
  height: number;

  seed: number;

  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  nextPieceId: number;

  selectedIndex: number | null;

  events: EngineEvent[];
};