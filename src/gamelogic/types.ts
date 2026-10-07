import type { EnginePhase } from './phases';
import type { RngState } from './rng';

export type LevelId = number;

export type PieceType = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'yellow' | 'keycard';

export type PieceId = number;

// ─────────────────────────────────────────────
// Item objective policy (Level-configurable)
// ─────────────────────────────────────────────

export type ItemObjectivesPolicy = 'noObjectives' | 'allowObjectives';

// ─────────────────────────────────────────────
// Clear Source (Match vs Item)
// ─────────────────────────────────────────────

export type ClearSource = 'match' | 'item';

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
  | { kind: 'firewall'; hp: number; maxHp: number; origin?: 'breach' | 'sweep' | 'level4Dormant' }
  | { kind: 'gate'; open: boolean }
  | { kind: 'leak'; id: number; progress: number; required: number }
  | { kind: 'contamination' }
  | { kind: 'sealKit' }
  | {
      kind: 'terminal';
      id: number;
      state: TerminalState;
      charge: number;
      requiredCharge: number;
      chargeColor: PieceType;
      /** If true: cannot be selected/swapped (slot-locked). */
      swapBlocked: boolean;
      /** If true: pieces may not occupy this cell ("blocker"). */
      blocksPiece: boolean;
      /** If true: gravity flow passes through this cell (does not split the column). */
      passThrough: boolean;
      /** If true: deliver keycards from the cell directly above this terminal. */
      deliverFromAbove: boolean;
    }
  | { kind: 'objectiveTerminal'; id: number; state: ObjectiveTerminalState; charge: number; requiredCharge: number }
  | { kind: 'signalSource'; id: number }
  | { kind: 'signalTarget'; id: number }
  | { kind: 'chargedCell' }
  | { kind: 'stoneTile'; hp: number; maxHp: number };

export type CellMark = 'enemyRed';

export type Cell = {
  blocked: boolean;
  pieceId: PieceId | null;
  obstacle?: CellObstacle;
  /**
   * Visual-only "floor mark" for special mechanics (slot-based, not piece-based).
   * Example: enemy turns can paint cleared slots red.
   */
  mark?: CellMark;
};

// ─────────────────────────────────────────────
// Cell Helper Functions
// ─────────────────────────────────────────────

export function isOccupied(cell: Cell): boolean {
  return cell.blocked || cell.obstacle != null;
}

export type TerminalObstacle = Extract<CellObstacle, { kind: 'terminal' }>;

/** If true: terminal blocks click+swap intent. */
export function terminalBlocksSwap(terminal: TerminalObstacle): boolean {
  return terminal.swapBlocked;
}

/** If true: the terminal cell may contain a piece after gravity resolves. */
export function terminalCanHoldPiece(terminal: TerminalObstacle): boolean {
  if (terminal.blocksPiece) return false;
  return terminal.state === 'open';
}

/** If true: gravity flow is blocked at this cell (splits the column). */
export function terminalBlocksGravityFlow(terminal: TerminalObstacle): boolean {
  if (terminal.passThrough) return false;
  return terminal.state !== 'open';
}

/** Returns the cell index that should contain the keycard for delivery checks. */
export function terminalKeycardSourceIndex(terminalIndex: number, width: number, terminal: TerminalObstacle): number {
  const fromAbove = terminal.deliverFromAbove || terminal.blocksPiece;
  return fromAbove ? terminalIndex - width : terminalIndex;
}

/** Swap passability (used by canSwap gate). */
export function terminalAllowsSwap(terminal: TerminalObstacle): boolean {
  if (terminalBlocksSwap(terminal)) return false;
  return terminal.state === 'open';
}

export function canHoldPiece(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  // chargedCell is passable (floor overlay)
  if (obs.kind === 'chargedCell') return true;

  if (obs.kind === 'terminal') return terminalCanHoldPiece(obs);

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

export function isEnemyRedMarked(cell: Cell): boolean {
  return cell.mark === 'enemyRed';
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
  /** Current HP at level start (may be 0 for dormant nodes). */
  hp: number;
  /** Max HP for UI + activation (defaults to hp when omitted). */
  maxHp?: number;
  /** Optional origin tag for rendering / special rules. */
  origin?: 'breach' | 'sweep' | 'level4Dormant';
};

export type FirewallSpawnPolicy = 'noTriples8';

export type FirewallSpawnDef = {
  count: number;
  hp: number;
  policy?: FirewallSpawnPolicy;
  avoidBorder?: boolean;
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
  /** If true: cannot be selected/swapped (slot-locked). */
  swapBlocked?: boolean;
  /** If true: pieces may not occupy this cell ("blocker"). */
  blocksPiece?: boolean;
  /** If true: gravity flow passes through this cell (does not split the column). */
  passThrough?: boolean;
  /** If true: deliver keycards from the cell directly above this terminal. */
  deliverFromAbove?: boolean;
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

// Level 08: Stone Tiles
export type StoneTileNodeDef = {
  index: number;
};

export type CollectObjectiveDef = {
  pieceType: PieceType;
  target: number;
};

export type LevelDefinition = {
  id: LevelId;
  width: number;
  height: number;
  baseSeed: number;

  moves: number;
  allowedTypes: PieceType[];

  // Optional non-hint objective title (UI may choose to display it).
  objectiveTitle?: string;

  // Generic "collect matched tiles of one color" objective.
  collectObjective?: CollectObjectiveDef;

  // Item objective policy (Level-configurable)
  itemObjectivesDefault?: ItemObjectivesPolicy;
  itemObjectives?: Partial<Record<ItemEffectKeyForEvent, ItemObjectivesPolicy>>;

  // Per-level item obstacle damage rules (engine-owned, applied on item hit area).
  itemObstacleDamage?: ItemObstacleDamageConfig;

  // Level/Mode policies (engine-owned; resolved into EngineState cached toggles)
  chargedFloorFromItems?: boolean;
  enemyTurnEnabled?: boolean;
  enemyTurnEveryMs?: number;

  // Level 07: Match Rush (units to win; 0/undefined = disabled)
  matchRushTargetUnits?: number;

  // Level 09: LaserRow -> Match4+ (countdowns to win; 0/undefined = disabled)
  laserRowMatch4Target?: number;
  // Level 09: Timer (seconds; 0/undefined = disabled)
  level9TimerStartSec?: number;
  level9TimerAfterFirstSec?: number;
  level9TimerAfterSecondSec?: number;

  // Move policy knobs (engine-owned; UI may hide/repurpose moves)
  movesLoseEnabled?: boolean; // default: true
  swapSpendsMove?: boolean; // default: true


  blockedIndices: number[];
  firewallNodes: FirewallNodeDef[];

  // Optional seeded random placement for firewall nodes (resolved at init).
  firewallSpawn?: FirewallSpawnDef;

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

  // Level 08+: Stone Tiles
  stoneTileNodes?: StoneTileNodeDef[];

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
// Pending Item Execution (engine-owned; delayed effects)
// ─────────────────────────────────────────────

export type PendingLaserRow = Readonly<{
  executeAtMs: number;
  target: Readonly<{ x: number; y: number }>;
  requestId: number;
}>;

// ─────────────────────────────────────────────
// Pending Turn Commit (turn-end must be engine-owned)
// ─────────────────────────────────────────────

export type PendingTurnCommit =
  | { kind: 'swap'; spendMove: boolean }
  | {
      kind: 'item';
      spendMove: boolean;
      /** Item key is required for itemCausedMatch attribution. */
      key?: ItemEffectKeyForEvent;
      /** RequestId from UI/intent; used for cross-event correlation. */
      requestId?: number;
      /** Guardrail: emit itemCausedMatch at most once per item commit. */
      matchOutcomeEmitted?: boolean;
    };

// ─────────────────────────────────────────────
// Swap Rejection
// ─────────────────────────────────────────────

export type SwapRejectReason = 'locked' | 'notAdjacent' | 'blocked' | 'empty';

// ─────────────────────────────────────────────
// Falling Animation Contract (Engine-owned payload; UI consumes)
// ─────────────────────────────────────────────

export type FallMove = {
  /** Piece ID that moves (or spawns). */
  id: PieceId;
  /**
   * Source cellIndex before falling.
   * null => piece is newly spawned; UI derives a spawn-above start position for this toIndex.
   */
  fromIndex: number | null;
  /** Destination cellIndex after falling. */
  toIndex: number;
  /**
   * Optional per-piece delay (ms) to make falls slightly asymmetrical / nicer.
   * Must be deterministic (computed in engine).
   */
  delayMs: number;

  /** Additional spawn stacking delay (engine-owned; 0 for non-spawns). */
  spawnStackDelayMs?: number;

};

export type FallPlan = Readonly<{
  moves: readonly FallMove[];

  /** Optional pause (ms) before any fall move starts (lets holes be visible). */
  holeDelayMs?: number;
}>;


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


  /**
   * Engine-owned payload for true falling animation.
   * Present only when kind==='fall' (by convention; enforced later via builders).
   */
  fallPlan?: FallPlan;
};

export type HardBoundaryKind = 'initLevel' | 'resetBoard';

// ─────────────────────────────────────────────
// Item Effect Keys (for turnCommitArmed payload)
// ─────────────────────────────────────────────

export type ItemEffectKeyForEvent = 'bomb3x3' | 'laserRow';

// ─────────────────────────────────────────────
// Item Obstacle Damage (per-level config)
// ─────────────────────────────────────────────

export type ItemObstacleHitMode = 'direct' | 'adjacent';

export type ItemObstacleDamageRule = {
  mode: ItemObstacleHitMode;
  damage: number;
};

export type ItemObstacleDamageByKind = Partial<Record<CellObstacle['kind'], ItemObstacleDamageRule>>;

export type ItemObstacleDamageConfig = Partial<Record<ItemEffectKeyForEvent, ItemObstacleDamageByKind>>;

export type ResolvedItemObstacleDamageConfig = Record<ItemEffectKeyForEvent, ItemObstacleDamageByKind>;

// ─────────────────────────────────────────────
// Engine Events
// ─────────────────────────────────────────────

export type EngineEvent =
  | { type: 'seededInit'; levelId: LevelId; width: number; height: number; seed: number }
  | { type: 'reset'; levelId: LevelId; seed: number }
  | { type: 'hardBoundary'; kind: HardBoundaryKind; nowMs: number; animTokenBase: number }
  | { type: 'phase'; phase: EnginePhase }
  | { type: 'select'; index: number }
  | { type: 'selectionCleared' }
  | { type: 'swap'; from: number; to: number }
  | { type: 'swapBack'; from: number; to: number }
  | { type: 'animBegin'; kind: EngineAnimKind; token: number; durationMs: number; enteredAtMs: number; deadlineAtMs: number }
  | { type: 'animDone'; mode: AnimDoneMode; kind: EngineAnimKind; token: number; dtMs: number; deltaMs: number }
  | { type: 'animDoneIgnored'; kind: EngineAnimKind; token: number; reason: AnimDoneIgnoreReason }
  | { type: 'swapRejected'; from: number; to: number; reason: SwapRejectReason }
  | { type: 'matchesFound'; clears: number; groups: number }
  | { type: 'matchGroup'; id: string; axis: 'h' | 'v'; len: number; indices: number[] }
  | {
      type: 'itemCausedMatch';
      key: ItemEffectKeyForEvent;
      requestId: number;
      /** Largest run length in the first detected wave (3/4/5/6+). */
      maxLen: number;
      /** Histogram for first detected wave. */
      len3: number;
      len4: number;
      len5: number;
      len6Plus: number;
      /** MatchGroup IDs (same turn/axis/endpoints/len scheme as matchGroup). */
      matchGroupIds: string[];
    }
  | { type: 'cleared'; count: number }
  | { type: 'gravity' }
  | { type: 'refilled'; count: number }
  | { type: 'deadlockCheck'; hasMove: boolean }
  | { type: 'shuffled'; attempts: number }
  | { type: 'movesSpent'; left: number }
  | { type: 'collectProgress'; pieceType: PieceType; gained: number; count: number; target: number }
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
  | { type: 'objectiveTerminalCharged'; terminalId: number; charge: number; required: number }
  | { type: 'objectiveTerminalActivated'; terminalId: number }
  // Level 04+: Laser Sweep events
  | { type: 'laserWarningSet'; kind: LaserLineKind; index: number }
  | { type: 'laserSweepStart'; kind: LaserLineKind; index: number }
  | { type: 'laserSweepCleared'; indices: number[] }
  | { type: 'laserSweepHazards'; contaminationIndices: number[]; firewallIndices: number[] }
  // Level 05+: Signal Network events
  | { type: 'cellCharged'; index: number }
  | { type: 'signalLinked' }
  // Item accept (engine acknowledged input)
  | { type: 'itemAccepted'; key: ItemEffectKeyForEvent; target: { x: number; y: number }; requestId: number }
  // First-class cascade observability (e.g. item preSteps)
  | { type: 'cascadeStep'; kind: 'itemLaserRowClear'; row: number; indices: number[]; cleared: number }
  | { type: 'cascadeStep'; kind: 'itemBomb3x3Blast'; center: { x: number; y: number }; indices: number[]; cleared: number }
  // Power/Item consumption ack (UI consumes only after this)
  | { type: 'powerUsed'; key: 'gridlaser' | 'bomb' | 'laser' | 'extraShuffle'; requestId: number }
  // ─── Pre-Falling Guardrails: Observability events ───
  | { type: 'turnCommitArmed'; kind: 'swap'; spendMove: boolean; from: number; to: number }
  | { type: 'turnCommitArmed'; kind: 'item'; key: ItemEffectKeyForEvent; target: { x: number; y: number }; requestId: number }
  | { type: 'turnEndStart'; kind: 'swap' | 'item'; spendMove: boolean }
  | { type: 'turnEndComplete' }
  | { type: 'turnSeparator' };

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

  // level/mode policies (cached from LevelDefinition)
  chargedFloorFromItems: boolean;
  enemyTurnEnabled: boolean;
  enemyTurnEveryMs: number;
  nextEnemyTurnAtMs: number;

  // item objective policy (per effect key)
  itemObjectives: Record<ItemEffectKeyForEvent, ItemObjectivesPolicy>;

  // item obstacle damage rules (resolved)
  itemObstacleDamage: ResolvedItemObstacleDamageConfig;

  movesTotal: number;
  movesLeft: number;

  // move policy (engine-owned)
  movesLoseEnabled: boolean;
  swapSpendsMove: boolean;

  // turn counter (0-based, increments after each complete player turn)
  turnIndex: number;

  // Generic collect objective
  collectPieceType: PieceType | null;
  collectTarget: number;
  collectCount: number;

  // Level 07: Match Rush
  matchRushTargetUnits: number;
  matchRushUnits: number;

  // Level 09: LaserRow -> Match4+ (engine-owned)
  laserRowMatch4Target: number;
  laserRowMatch4Remaining: number;

  // Level 09: Timer (engine-owned; 0=start not yet initialized)
  level9TimerStartSec: number;
  level9TimerAfterFirstSec: number;
  level9TimerAfterSecondSec: number;
  level9TimerStage: number; // 0=start, 1=after first success, 2=after second+ success
  level9TimerDeadlineAtMs: number; // performance.now()-based; lose when nowMs >= deadline

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

  // Level 08+: Stone Tiles
  stoneTilesTotal: number;
  stoneTilesRemaining: number;

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

  pendingLaserRow?: PendingLaserRow | null;

  // commit marker for "apply turn-end when we reach idle"
  pendingTurnCommit: PendingTurnCommit | null;

  /**
   * When set, cascade effects (objectives / level mechanics) are disabled for the current resolve chain.
   * Used by items like laserRow to ensure item-driven clears do not progress objectives.
   * Cleared when we reach idle.
   */
  cascadeEffectPolicy?: 'noObjectives';

  /**
   * Transient flag: while true, every clear slot in this resolve chain is painted red (enemy territory).
   * Cleared when we return to idle.
   */
  enemyMarkActive?: boolean;
};
