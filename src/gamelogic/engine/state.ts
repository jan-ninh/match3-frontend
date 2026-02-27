import type {
  EngineEvent,
  EngineState,
  ItemEffectKeyForEvent,
  ItemObjectivesPolicy,
  LaserWarning,
  LevelDefinition,
  LevelId,
  PieceId,
  ResolvedItemObstacleDamageConfig,
} from '../types';
import { getLevelDefinition } from '../levels';
import { randomSeed32 } from '../rng';
import { buildInitialBoard } from '../board';
import { stabilizeBoard } from '../cascade';
import { assertBoardIntegrity, assertPhaseInvariants } from '../invariants';
import { SWAP_MS } from '../animTimings';

import { sanitizeSwapMs } from './anim';
import { mkSeededInit, pushEvents } from './events';

/**
 * Select initial laser warning line (before turn 0).
 * Deterministic based on seed.
 */
function selectInitialLaserWarning(seed: number, width: number, height: number): LaserWarning {
  // candidates: rows + cols
  const totalLines = width + height;
  const pick = seed % totalLines;

  if (pick < height) {
    return { kind: 'row', index: pick };
  }
  return { kind: 'col', index: pick - height };
}

function resolveItemObjectives(level: LevelDefinition): Record<ItemEffectKeyForEvent, ItemObjectivesPolicy> {
  const def: ItemObjectivesPolicy = level.itemObjectivesDefault ?? 'noObjectives';

  const out: Record<ItemEffectKeyForEvent, ItemObjectivesPolicy> = {
    bomb3x3: def,
    laserRow: def,
  };

  const o = level.itemObjectives;
  if (o?.bomb3x3) out.bomb3x3 = o.bomb3x3;
  if (o?.laserRow) out.laserRow = o.laserRow;

  return out;
}

function resolveItemObstacleDamage(level: LevelDefinition): ResolvedItemObstacleDamageConfig {
  const out: ResolvedItemObstacleDamageConfig = {
    bomb3x3: {},
    laserRow: {},
  };

  // Default parity: preserve legacy stoneTile item damage when a level uses stone tiles.
  const hasStone = (level.stoneTileNodes?.length ?? 0) > 0;
  if (hasStone) {
    out.laserRow = { ...out.laserRow, stoneTile: { mode: 'direct', damage: 2 } };
    out.bomb3x3 = { ...out.bomb3x3, stoneTile: { mode: 'direct', damage: 3 } };
  }

  const cfg = level.itemObstacleDamage;
  if (cfg?.laserRow) out.laserRow = { ...out.laserRow, ...cfg.laserRow };
  if (cfg?.bomb3x3) out.bomb3x3 = { ...out.bomb3x3, ...cfg.bomb3x3 };

  return out;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function resolveEnemyEveryMs(level: LevelDefinition): number {
  const enabled = level.enemyTurnEnabled === true;
  if (!enabled) return 0;

  const raw = level.enemyTurnEveryMs ?? 3000;
  return clampInt(raw, 250, 60 * 1000);
}

export function createState(
  levelId: LevelId,
  seed: number,
  extraEvents: EngineEvent[] = [],
  animTokenBase = 0,
  swapMs = SWAP_MS,
  nowMs = 0,
): EngineState {
  const level = getLevelDefinition(levelId);
  const built = buildInitialBoard(level, seed);

  // Start with built cells and pieces
  let cells = built.cells;
  let pieces = built.pieces;
  let nextPieceId = built.nextPieceId;
  const rngState = built.rngState;

  // ─────────────────────────────────────────────
  // Level 03+: Place terminals as obstacles
  // ─────────────────────────────────────────────
  if (level.terminalNodes && level.terminalNodes.length > 0) {
    cells = cells.slice();
    for (const node of level.terminalNodes) {
      // Remove any piece that was randomly placed at terminal position
      const existingPid = cells[node.index]?.pieceId;
      if (existingPid !== null && existingPid !== undefined) {
        pieces = { ...pieces };
        delete pieces[existingPid];
      }

      const requiredCharge = Math.max(0, node.requiredCharge | 0);
      const initialState: 'locked' | 'open' = requiredCharge <= 0 ? 'open' : 'locked';

      const swapBlocked = node.swapBlocked === true;
      const blocksPiece = node.blocksPiece === true;
      const passThrough = node.passThrough === true;
      const deliverFromAbove = node.deliverFromAbove === true;

      cells[node.index] = {
        blocked: false, // Terminal manages its own passability via obstacle state
        pieceId: null,
        obstacle: {
          kind: 'terminal',
          id: node.id,
          state: initialState,
          charge: 0,
          requiredCharge,
          chargeColor: node.chargeColor,
          swapBlocked,
          blocksPiece,
          passThrough,
          deliverFromAbove,
        },
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 03+: Place keycards as special pieces
  // ─────────────────────────────────────────────
  if (level.keycardNodes && level.keycardNodes.length > 0) {
    // Ensure we have mutable copies
    if (cells === built.cells) cells = cells.slice();
    if (pieces === built.pieces) pieces = { ...pieces };

    for (const node of level.keycardNodes) {
      // Remove any existing piece at keycard position
      const existingPid = cells[node.index]?.pieceId;
      if (existingPid !== null && existingPid !== undefined) {
        delete pieces[existingPid];
      }

      // Place keycard as a special piece
      const keycardId = nextPieceId as PieceId;
      nextPieceId++;

      pieces[keycardId] = {
        id: keycardId,
        type: 'keycard',
        cellIndex: node.index,
      };

      cells[node.index] = {
        ...cells[node.index]!,
        pieceId: keycardId,
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 04+: Place objective terminals as obstacles
  // ─────────────────────────────────────────────
  if (level.objectiveTerminalNodes && level.objectiveTerminalNodes.length > 0) {
    if (cells === built.cells) cells = cells.slice();
    if (pieces === built.pieces) pieces = { ...pieces };

    for (const node of level.objectiveTerminalNodes) {
      // Remove any piece that was randomly placed at terminal position
      const existingPid = cells[node.index]?.pieceId;
      if (existingPid !== null && existingPid !== undefined) {
        delete pieces[existingPid];
      }

      cells[node.index] = {
        blocked: false, // Objective terminal occupies cell but isn't "blocked" in traditional sense
        pieceId: null,
        obstacle: {
          kind: 'objectiveTerminal',
          id: node.id,
          state: 'inactive',
          charge: 0,
          requiredCharge: node.requiredCharge,
        },
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 05+: Place signal source nodes as obstacles
  // ─────────────────────────────────────────────
  if (level.signalSourceNodes && level.signalSourceNodes.length > 0) {
    if (cells === built.cells) cells = cells.slice();
    if (pieces === built.pieces) pieces = { ...pieces };

    for (const node of level.signalSourceNodes) {
      // Remove any piece that was randomly placed at source position
      const existingPid = cells[node.index]?.pieceId;
      if (existingPid !== null && existingPid !== undefined) {
        delete pieces[existingPid];
      }

      cells[node.index] = {
        blocked: true, // Signal source is immovable, blocks pieces
        pieceId: null,
        obstacle: {
          kind: 'signalSource',
          id: node.id,
        },
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 05+: Place signal target nodes as obstacles
  // ─────────────────────────────────────────────
  if (level.signalTargetNodes && level.signalTargetNodes.length > 0) {
    if (cells === built.cells) cells = cells.slice();
    if (pieces === built.pieces) pieces = { ...pieces };

    for (const node of level.signalTargetNodes) {
      // Remove any piece that was randomly placed at target position
      const existingPid = cells[node.index]?.pieceId;
      if (existingPid !== null && existingPid !== undefined) {
        delete pieces[existingPid];
      }

      cells[node.index] = {
        blocked: true, // Signal target is immovable, blocks pieces
        pieceId: null,
        obstacle: {
          kind: 'signalTarget',
          id: node.id,
        },
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 08: Place stone tiles (blocked, not swappable, HP hidden)
  // ─────────────────────────────────────────────
  if (level.stoneTileNodes && level.stoneTileNodes.length > 0) {
    if (cells === built.cells) cells = cells.slice();
    if (pieces === built.pieces) pieces = { ...pieces };

    for (const node of level.stoneTileNodes) {
      const idx = node.index | 0;
      if (idx < 0 || idx >= cells.length) continue;

      const existingPid = cells[idx]?.pieceId;
      if (existingPid !== null && existingPid !== undefined) {
        delete pieces[existingPid];
      }

      const maxHp = 15;
      const hp = 15;

      cells[idx] = {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'stoneTile', hp, maxHp },
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 04+: Initialize laser warning (fair: shown before turn 0)
  // ─────────────────────────────────────────────
  const sweepEnabled = level.sweepEnabled ?? false;
  let laserWarning: LaserWarning | null = null;
  const initialEvents: EngineEvent[] = [];

  if (sweepEnabled) {
    laserWarning = selectInitialLaserWarning(seed, level.width, level.height);
    initialEvents.push({ type: 'laserWarningSet', kind: laserWarning.kind, index: laserWarning.index });
  }

  const itemObjectives = resolveItemObjectives(level);
  const itemObstacleDamage = resolveItemObstacleDamage(level);

  // ─────────────────────────────────────────────
  // Build initial state
  // ─────────────────────────────────────────────
  const stoneTotal = level.stoneTileNodes?.length ?? 0;

  const lrMatch4Target = level.laserRowMatch4Target ?? 0;
  const movesLoseEnabled = level.movesLoseEnabled ?? true;
  const swapSpendsMove = level.swapSpendsMove ?? true;

  const timerStartSec = level.level9TimerStartSec ?? 0;
  const timerAfterFirstSec = level.level9TimerAfterFirstSec ?? 0;
  const timerAfterSecondSec = level.level9TimerAfterSecondSec ?? 0;

  const timerDeadlineAtMs = timerStartSec > 0 && nowMs > 0 ? nowMs + timerStartSec * 1000 : 0;

  const chargedFloorFromItems = level.chargedFloorFromItems ?? false;

  const enemyTurnEnabled = level.enemyTurnEnabled === true;
  const enemyTurnEveryMs = resolveEnemyEveryMs(level);
  const nextEnemyTurnAtMs = enemyTurnEnabled && enemyTurnEveryMs > 0 && nowMs > 0 ? nowMs + enemyTurnEveryMs : 0;

  // Level 01: Breach count = number of firewall obstacles present at init.
  // (Seeded random placement is resolved during board build.)
  const breachesTotal = cells.reduce((acc, c) => (c.obstacle?.kind === 'firewall' ? acc + 1 : acc), 0);

  const base: EngineState = {
    levelId,
    width: level.width,
    height: level.height,

    seed,
    rngState,
    allowedTypes: level.allowedTypes,

    chargedFloorFromItems,

    enemyTurnEnabled,
    enemyTurnEveryMs,
    nextEnemyTurnAtMs,

    itemObjectives,
    itemObstacleDamage,

    movesTotal: level.moves,
    movesLeft: level.moves,

    movesLoseEnabled,
    swapSpendsMove,

    // Turn counter (0-based)
    turnIndex: 0,

    // Level 07: Match Rush (units to win; 0=disabled)
    matchRushTargetUnits: level.matchRushTargetUnits ?? 0,
    matchRushUnits: 0,

    // Level 09: LaserRow -> Match4+ (engine-owned)
    laserRowMatch4Target: lrMatch4Target,
    laserRowMatch4Remaining: lrMatch4Target,

    level9TimerStartSec: timerStartSec,
    level9TimerAfterFirstSec: timerAfterFirstSec,
    level9TimerAfterSecondSec: timerAfterSecondSec,
    level9TimerStage: 0,
    level9TimerDeadlineAtMs: timerDeadlineAtMs,

    // Level 01: Firewall/Gate mechanics
    breachesTotal,
    breachesRemaining: breachesTotal,

    gateOpen: false,
    gateIndices: level.gateIndices,

    // Level 02+: Leak mechanics
    leaksTotal: level.leakNodes.length,
    leaksSealed: 0,

    // Level 02+: Balancing knobs
    maxSealKitsOnBoard: level.maxSealKitsOnBoard ?? 0, // 0 = unlimited
    contaminationLoseThreshold: level.contaminationLoseThreshold ?? null,
    spreadEveryNTurns: level.spreadEveryNTurns ?? 1,

    // Level 03+: Terminal/Keycard mechanics
    terminalsTotal: level.terminalNodes?.length ?? 0,
    terminalsVerified: 0,
    keycardsTotal: level.keycardNodes?.length ?? 0,
    keycardsDelivered: 0,

    // Level 04+: Objective Terminal mechanics
    objectiveTerminalsTotal: level.objectiveTerminalNodes?.length ?? 0,
    objectiveTerminalsActivated: 0,

    // Level 04+: Laser Sweep mechanics
    sweepEnabled,
    sweepContaminationCount: level.sweepContaminationCount ?? 4,
    sweepFirewallCount: level.sweepFirewallCount ?? 2,
    sweepEveryNTurns: level.sweepEveryNTurns ?? 1,
    laserWarning,
    lastSweptLines: [],

    // Level 05+: Signal Network mechanics
    signalSourcesTotal: level.signalSourceNodes?.length ?? 0,
    signalTargetsTotal: level.signalTargetNodes?.length ?? 0,
    signalLinked: false,
    chargedCellCount: 0,

    // Level 08: Stone Tiles
    stoneTilesTotal: stoneTotal,
    stoneTilesRemaining: stoneTotal,

    cells,
    pieces,
    nextPieceId,

    pendingSwap: null,
    pendingTurnCommit: null,
    selectedIndex: null,

    phase: 'init',
    inputLocked: true,

    // animation timing (UI reads this)
    swapMs: sanitizeSwapMs(swapMs),

    // Carry forward monotonic clock (never regress to 0 on init/reset)
    nowMs,
    anim: null,
    animToken: animTokenBase,

    events: [mkSeededInit(levelId, level.width, level.height, seed), ...initialEvents, ...extraEvents],
  };

  const stabilized = stabilizeBoard(base);
  const withEvents = pushEvents(stabilized.state, stabilized.events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(withEvents, 'createState');
    assertPhaseInvariants(withEvents, 'createState');
  }

  return withEvents;
}

export function createInitialState(levelId: LevelId): EngineState {
  return createState(levelId, randomSeed32(), [], 1, SWAP_MS, 0);
}
