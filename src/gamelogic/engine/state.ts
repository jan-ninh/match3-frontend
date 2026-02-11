// src/gamelogic/engine/state.ts
import type { EngineEvent, EngineState, LevelId, PieceId } from '../types';
import { getLevelDefinition } from '../levels';
import { buildInitialBoard } from '../board';
import { stabilizeBoard } from '../cascade';
import { assertBoardIntegrity, assertPhaseInvariants } from '../invariants';
import { SWAP_MS } from '../animTimings';

import { sanitizeSwapMs } from './anim';
import { mkSeededInit, pushEvents } from './events';

export function createState(levelId: LevelId, seed: number, extraEvents: EngineEvent[] = [], animTokenBase = 0, swapMs = SWAP_MS): EngineState {
  const level = getLevelDefinition(levelId);
  const built = buildInitialBoard(level, seed);

  // Start with built cells and pieces
  let cells = built.cells;
  let pieces = built.pieces;
  let nextPieceId = built.nextPieceId;

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

      cells[node.index] = {
        blocked: false, // Terminal manages its own passability via obstacle state
        pieceId: null,
        obstacle: {
          kind: 'terminal',
          id: node.id,
          state: 'locked',
          charge: 0,
          requiredCharge: node.requiredCharge,
          chargeColor: node.chargeColor,
        },
      };
    }
  }

  // ─────────────────────────────────────────────
  // Level 03+: Place keycards as special pieces
  // ─────────────────────────────────────────────
  if (level.keycardNodes && level.keycardNodes.length > 0) {
    // Ensure we have mutable copies
    if (cells === built.cells) {
      cells = cells.slice();
    }
    if (pieces === built.pieces) {
      pieces = { ...pieces };
    }

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
  // Build initial state
  // ─────────────────────────────────────────────
  const base: EngineState = {
    levelId,
    width: level.width,
    height: level.height,

    seed,
    rngState: built.rngState,
    allowedTypes: level.allowedTypes,
    movesTotal: level.moves,
    movesLeft: level.moves,

    // Turn counter (0-based)
    turnIndex: 0,

    // Level 01: Firewall/Gate mechanics
    breachesTotal: level.firewallNodes.length,
    breachesRemaining: level.firewallNodes.length,

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

    cells,
    pieces,
    nextPieceId,

    pendingSwap: null,

    selectedIndex: null,

    phase: 'init',
    inputLocked: true,

    // animation timing (UI reads this)
    swapMs: sanitizeSwapMs(swapMs),

    nowMs: 0,
    anim: null,
    animToken: animTokenBase,

    events: [mkSeededInit(levelId, level.width, level.height, seed), ...extraEvents],
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
  const level = getLevelDefinition(levelId);
  return createState(levelId, level.baseSeed, [], 1, SWAP_MS);
}
