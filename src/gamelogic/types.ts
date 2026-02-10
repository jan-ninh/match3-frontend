import type { EnginePhase } from './phases';
import type { RngState } from './rng';

export type LevelId = number;

export type PieceType = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'yellow';

export type PieceId = number;

export type CellObstacle = 'firewall' | 'gate';

export type Cell = {
  blocked: boolean;
  pieceId: PieceId | null;

  // optional obstacles
  obstacle?: CellObstacle;
  hp?: number;
  maxHp?: number;

  // gate visuals (stays blocked)
  gateOpen?: boolean;
};

export type Piece = {
  id: PieceId;
  type: PieceType;

  // where this piece currently sits (so UI can animate by moving entities)
  cellIndex: number;
};

export type FirewallNodeDef = {
  index: number;
  hp: number;
};

export type LevelDefinition = {
  id: LevelId;
  width: number;
  height: number;
  baseSeed: number;

  moves: number;
  allowedTypes: PieceType[];

  blockedIndices?: number[];
  firewallNodes?: FirewallNodeDef[];
  gateIndices?: number[];
};

export type PendingSwap = {
  from: number;
  to: number;
  snapCells: Cell[];
  snapPieces: Record<PieceId, Piece>;
};

export type SwapRejectReason = 'locked' | 'notAdjacent' | 'blocked' | 'empty';

export type EngineAnimKind = 'swap' | 'swapBack' | 'fall';

export type AnimDoneMode = 'early' | 'auto';

export type AnimDoneIgnoreReason = 'missingAnim' | 'wrongPhase' | 'wrongKind' | 'wrongToken' | 'missingPendingSwap';

export type EngineEvent =
  | { type: 'seededInit'; levelId: LevelId; width: number; height: number; seed: number }
  | { type: 'reset'; levelId: LevelId; seed: number }
  | { type: 'phase'; phase: EnginePhase }
  | { type: 'select'; index: number }
  | { type: 'selectionCleared' }
  | { type: 'swap'; from: number; to: number }
  | { type: 'swapBack'; from: number; to: number }
  | { type: 'animDone'; mode: AnimDoneMode; kind: EngineAnimKind; token: number; dtMs: number; deltaMs: number }
  | { type: 'animDoneIgnored'; kind: EngineAnimKind; token: number; reason: AnimDoneIgnoreReason }
  | { type: 'swapRejected'; from: number; to: number; reason: SwapRejectReason }
  | { type: 'matchesFound'; clears: number; groups: number }
  | { type: 'cleared'; count: number }
  | { type: 'gravity' }
  | { type: 'refilled'; count: number }
  | { type: 'deadlockCheck'; hasMove: boolean }
  | { type: 'shuffled'; attempts: number }
  | { type: 'movesSpent'; left: number }
  | { type: 'firewallDamaged'; index: number; hp: number }
  | { type: 'firewallDestroyed'; index: number }
  | { type: 'gateOpened' }
  | { type: 'win' }
  | { type: 'lose' };

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

  movesTotal: number;
  movesLeft: number;

  breachesTotal: number;
  breachesRemaining: number;

  gateOpen: boolean;
  gateIndices: number[];

  cells: Cell[];
  pieces: Record<PieceId, Piece>;
  nextPieceId: number;

  selectedIndex: number | null;

  phase: EnginePhase;
  inputLocked: boolean;

  // animation timing (single source of truth; UI reads this)
  swapMs: number;

  // engine-owned monotonic clock (updated via tick(nowMs))
  nowMs: number;

  // current wait-phase animation (optional; never a single point of failure)
  anim: EngineAnim | null;

  // increasing token to invalidate old anim-done events
  animToken: number;

  events: EngineEvent[];
  pendingSwap: PendingSwap | null;
};
