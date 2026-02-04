import type { EnginePhase } from './phases';
import type { RngState } from './rng';

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

export type PendingSwap = {
  from: number;
  to: number;
  snapCells: Cell[];
  snapPieces: Record<PieceId, Piece>;
};

export type SwapRejectReason = 'locked' | 'notAdjacent' | 'blocked' | 'empty';

export type EngineEvent =
  | { type: 'seededInit'; levelId: LevelId; width: number; height: number; seed: number }
  | { type: 'reset'; levelId: LevelId; seed: number }
  | { type: 'phase'; phase: EnginePhase }
  | { type: 'select'; index: number }
  | { type: 'selectionCleared' }
  | { type: 'swap'; from: number; to: number }
  | { type: 'swapBack'; from: number; to: number }
  | { type: 'swapRejected'; from: number; to: number; reason: SwapRejectReason }
  | { type: 'matchesFound'; clears: number; groups: number }
  | { type: 'cleared'; count: number }
  | { type: 'gravity' }
  | { type: 'refilled'; count: number }
  | { type: 'deadlockCheck'; hasMove: boolean }
  | { type: 'shuffled'; attempts: number };

export type EngineAnimKind = 'swap' | 'swapBack' | 'fall';

export type EngineAnim = {
  kind: EngineAnimKind;
  enteredAtMs: number;
  durationMs: number;
  deadlineAtMs: number;
  token: number;
};

export type EngineState = {
  levelId: LevelId;
  width: number;
  height: number;

  // base seed for this run (display / replay header)
  seed: number;

  // evolving RNG state (deterministic replay)
  rngState: RngState;

  // cached level rules
  allowedTypes: PieceType[];

  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  nextPieceId: number;

  selectedIndex: number | null;

  phase: EnginePhase;
  inputLocked: boolean;

  // engine-owned monotonic clock (updated via tick(nowMs))
  nowMs: number;

  // current wait-phase animation (optional; never a single point of failure)
  anim: EngineAnim | null;

  // increasing token to invalidate old anim-done events
  animToken: number;

  events: EngineEvent[];
  pendingSwap: PendingSwap | null;
};
