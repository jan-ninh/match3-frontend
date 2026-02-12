// src/gamelogic/types.ts
import type { EnginePhase } from './phases';
import type { RngState } from './rng';

export type LevelId = number;

export type PieceType = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'yellow' | 'keycard';

export type PieceId = number;

// ─────────────────────────────────────────────
// Terminal State (Level 03+)
// ─────────────────────────────────────────────

export type TerminalState = 'locked' | 'open' | 'verified';

// ─────────────────────────────────────────────
// Objective Terminal State (Level 04 Boss)
// ─────────────────────────────────────────────

export type ObjectiveTerminalState = 'inactive' | 'active';

// ─────────────────────────────────────────────
// Signal Network State (Level 05)
// ─────────────────────────────────────────────

export type SignalNodeKind = 'source' | 'target';

// ─────────────────────────────────────────────
// Laser Warning Line (Level 04)
// ─────────────────────────────────────────────

export type LaserLineKind = 'row' | 'col';

export type LaserWarning = {
  kind: LaserLineKind;
  index: number; // row or column index (0-7)
};

// ─────────────────────────────────────────────
// Cell Obstacles
// ─────────────────────────────────────────────

export type CellObstacle =
  | { kind: 'firewall'; hp: number; maxHp: number; origin?: 'breach' | 'sweep' }
  | { kind: 'gate'; open: boolean }
  | { kind: 'leak'; id: number; progress: number; required: number }
  | { kind: 'contamination' }
  | { kind: 'sealKit' }
  | { kind: 'terminal'; id: number; state: TerminalState; charge: number; requiredCharge: number; chargeColor: PieceType }
  | { kind: 'objectiveTerminal'; id: number; state: ObjectiveTerminalState; charge: number; requiredCharge: number }
  | { kind: 'signalSource'; id: number }
  | { kind: 'signalTarget'; id: number }
  | { kind: 'chargedCell' };

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
  if (cell.blocked) return false;
  const obs = cell.obstacle;
  if (!obs) return true;
  // chargedCell is passable (pieces can fall through)
  if (obs.kind === 'chargedCell') return true;
  return false;
}

export function isLeakSealed(cell: Cell): boolean {
  const obs = cell.obstacle;
  return obs?.kind === 'leak' && obs.progress >= obs.required;
}

export function getLeakObstacle(cell: Cell): Extract<CellObstacle, { kind: 'leak' }> | null {
  const obs = cell.obstacle;
  return obs?.kind === 'leak' ? obs : null;
}

export function getTerminalObstacle(cell: Cell): Extract<CellObstacle, { kind: 'terminal' }> | null {
  const obs = cell.obstacle;
  return obs?.kind === 'terminal' ? obs : null;
}

export function isTerminalOpen(cell: Cell): boolean {
  const obs = cell.obstacle;
  return obs?.kind === 'terminal' && obs.state === 'open';
}

export function getObjectiveTerminalObstacle(cell: Cell): Extract<CellObstacle, { kind: 'objectiveTerminal' }> | null {
  const obs = cell.obstacle;
  return obs?.kind === 'objectiveTerminal' ? obs : null;
}

export function isObjectiveTerminalActive(cell: Cell): boolean {
  const obs = cell.obstacle;
  return obs?.kind === 'objectiveTerminal' && obs.state === 'active';
}

export function isChargedCell(cell: Cell): boolean {
  return cell.obstacle?.kind === 'chargedCell';
}

export function isSignalSource(cell: Cell): boolean {
  return cell.obstacle?.kind === 'signalSource';
}

export function isSignalTarget(cell: Cell): boolean {
  return cell.obstacle?.kind === 'signalTarget';
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

export type TerminalNodeDef = {
  index: number;
  id: number;
  requiredCharge: number;
  chargeColor: PieceType;
};

export type KeycardNodeDef = {
  index: number;
};

// Level 04: Objective Terminal (Boss variant - no color requirement)
export type ObjectiveTerminalNodeDef = {
  index: number;
  id: number;
  requiredCharge: number;
};

// Level 05: Signal Network nodes
export type SignalSourceNodeDef = {
  index: number;
  id: number;
};

export type SignalTargetNodeDef = {
  index: number;
  id: number;
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

  // Level 03+: Terminal/Keycard mechanics
  terminalNodes: TerminalNodeDef[];
  keycardNodes: KeycardNodeDef[];

  // Level 04+: Objective Terminal mechanics (Boss variant)
  objectiveTerminalNodes?: ObjectiveTerminalNodeDef[];

  // Level 04+: Sweep mechanics
  sweepEnabled?: boolean;
  sweepContaminationCount?: number;
  sweepFirewallCount?: number;
  sweepEveryNTurns?: number;

  // Level 05+: Signal Network mechanics
  signalSourceNodes?: SignalSourceNodeDef[];
  signalTargetNodes?: SignalTargetNodeDef[];

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
  | { type: 'contaminationLose'; count: number }
  // Level 03+: Terminal/Keycard events
  | { type: 'terminalCharged'; terminalId: number; charge: number; requiredCharge: number }
  | { type: 'terminalOpened'; terminalId: number }
  | { type: 'keycardDelivered'; terminalId: number; keycardIndex: number }
  | { type: 'terminalVerified'; terminalId: number }
  // Level 04+: Objective Terminal events
  | { type: 'objectiveTerminalCharged'; terminalId: number; charge: number; requiredCharge: number }
  | { type: 'objectiveTerminalActivated'; terminalId: number }
  // Level 04+: Laser Sweep events
  | { type: 'laserWarningSet'; kind: LaserLineKind; index: number }
  | { type: 'laserSweepStart'; kind: LaserLineKind; index: number }
  | { type: 'laserSweepCleared'; indices: number[] }
  | { type: 'laserSweepHazards'; contaminationIndices: number[]; firewallIndices: number[] }
  // Level 05+: Signal Network events
  | { type: 'cellCharged'; index: number }
  | { type: 'signalLinked' };

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

  // Level 03+: Terminal/Keycard mechanics
  terminalsTotal: number;
  terminalsVerified: number;
  keycardsTotal: number;
  keycardsDelivered: number;

  // Level 04+: Objective Terminal mechanics
  objectiveTerminalsTotal: number;
  objectiveTerminalsActivated: number;

  // Level 04+: Laser Sweep mechanics
  sweepEnabled: boolean;
  sweepContaminationCount: number;
  sweepFirewallCount: number;
  sweepEveryNTurns: number;
  laserWarning: LaserWarning | null; // current warning (null = none yet)
  lastSweptLines: LaserWarning[]; // last 2 swept lines for no-repeat rule

  // Level 05+: Signal Network mechanics
  signalSourcesTotal: number;
  signalTargetsTotal: number;
  signalLinked: boolean; // true when Source connected to Target via charged cells
  chargedCellCount: number; // for HUD display

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
