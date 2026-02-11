// src/gamelogic/types.ts
import type { EnginePhase } from './phases';
import type { RngState } from './rng';

export type LevelId = number;

export type PieceType = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'yellow';

export type PieceId = number;

export type CellObstacle =
  | { kind: 'firewall'; hp: number; maxHp: number }
  | { kind: 'gate'; open: boolean }
  | { kind: 'leak'; id: number; progress: number; required: number }
  | { kind: 'contamination' }
  | { kind: 'sealKit' };

export type Cell = {
  blocked: boolean;
  pieceId: PieceId | null;
  obstacle?: CellObstacle;
};

// ─────────────────────────────────────────────
// Cell Helper Functions
// ─────────────────────────────────────────────

export function isOccupied(cell: Cell): boolean {
  return cell.blocked || cell.obstacle != null;
}

export function canHoldPiece(cell: Cell): boolean {
  return !cell.blocked && cell.obstacle == null;
}

export function isLeakSealed(cell: Cell): boolean {
  const obs = cell.obstacle;
  return obs?.kind === 'leak' && obs.progress >= obs.required;
}

export function getLeakObstacle(cell: Cell): Extract<CellObstacle, { kind: 'leak' }> | null {
  const obs = cell.obstacle;
  return obs?.kind === 'leak' ? obs : null;
}

// ─────────────────────────────────────────────
// Piece
// ─────────────────────────────────────────────

export type Piece = {
  id: PieceId;
  type: PieceType;
  cellIndex: number;
};

// ─────────────────────────────────────────────
// Level Definition
// ─────────────────────────────────────────────

export type FirewallNodeDef = {
  index: number;
  hp: number;
};

export type LeakNodeDef = {
  index: number;
  patchStepsRequired: number;
};

export type LevelDefinition = {
  id: LevelId;
  width: number;
  height: number;
  baseSeed: number;

  moves: number;
  allowedTypes: PieceType[];

  blockedIndices: number[];
  firewallNodes: FirewallNodeDef[];
  gateIndices: number[];

  // Level 02+: Leak mechanics
  leakNodes: LeakNodeDef[];

  // Balancing knobs (optional)
  maxSealKitsOnBoard?: number;
  contaminationLoseThreshold?: number;
  spreadPerTurn?: number;
  spreadEveryNTurns?: number;
};

// ─────────────────────────────────────────────
// Pending Swap (for animation rollback)
// ─────────────────────────────────────────────

export type PendingSwap = {
  from: number;
  to: number;
  snapCells: Cell[];
  snapPieces: Record<PieceId, Piece>;
};

// ─────────────────────────────────────────────
// Swap Rejection
// ─────────────────────────────────────────────

export type SwapRejectReason = 'locked' | 'notAdjacent' | 'blocked' | 'empty';

// ─────────────────────────────────────────────
// Animation
// ─────────────────────────────────────────────

export type EngineAnimKind = 'swap' | 'swapBack' | 'fall';

export type AnimDoneMode = 'early' | 'auto';

export type AnimDoneIgnoreReason = 'missingAnim' | 'wrongPhase' | 'wrongKind' | 'wrongToken' | 'missingPendingSwap';

export type EngineAnim = {
  kind: EngineAnimKind;
  enteredAtMs: number;
  durationMs: number;
  deadlineAtMs: number;
  token: number;
};

// ─────────────────────────────────────────────
// Engine Events
// ─────────────────────────────────────────────

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
  | { type: 'lose' }
  // Level 02+: Leak/Contamination events
  | { type: 'turnEnd'; turnIndex: number }
  | { type: 'spreadTick'; leakId: number; targetIndex: number | null }
  | { type: 'contaminationSpawned'; index: number; leakId: number }
  | { type: 'contaminationCleared'; indices: number[] }
  | { type: 'sealKitSpawned'; index: number; leakId: number }
  | { type: 'sealKitTriggered'; index: number; targetLeakId: number }
  | { type: 'leakPatched'; leakId: number; progress: number; required: number }
  | { type: 'leakSealed'; leakId: number }
  | { type: 'contaminationLose'; count: number };

// ─────────────────────────────────────────────
// Engine State
// ─────────────────────────────────────────────

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

  // turn counter (0-based, increments after each complete player turn)
  turnIndex: number;

  // Level 01: Firewall/Gate mechanics
  breachesTotal: number;
  breachesRemaining: number;

  gateOpen: boolean;
  gateIndices: number[];

  // Level 02+: Leak mechanics
  leaksTotal: number;
  leaksSealed: number;

  // Level 02+: Balancing knobs (copied from LevelDefinition)
  maxSealKitsOnBoard: number;
  contaminationLoseThreshold: number | null;
  spreadEveryNTurns: number;

  // Board state
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
