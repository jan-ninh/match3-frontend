// src/gamelogic/engine/state.ts
import type { EngineEvent, EngineState, LevelId } from '../types';
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

    cells: built.cells,
    pieces: built.pieces,
    nextPieceId: built.nextPieceId,

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
