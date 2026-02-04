import type { EngineEvent, EngineState, LevelId, SwapRejectReason } from './types';
import { getLevelDefinition } from './levels';
import { buildInitialBoard, canSwap, swapCellsImmutable, swapPiecesPositionsImmutable } from './board';
import { detectMatches } from './match';
import { stabilizeBoard } from './cascade';
import { assertBoardIntegrity } from './invariants';
import { ANIM_EPSILON_MS, SWAP_MS } from './animTimings';

type InitAction = { type: 'initLevel'; levelId: LevelId };
type ClickAction = { type: 'clickCell'; index: number };
type ResetAction = { type: 'resetBoard' };
type SwapAttemptAction = { type: 'swapAttempt'; from: number; to: number };

// engine-owned time
type TickAction = { type: 'tick'; nowMs: number };

// optional UI “done” signals (never the only escape hatch)
type SwapAnimDoneAction = { type: 'swapAnimDone'; token: number };
type SwapBackAnimDoneAction = { type: 'swapBackAnimDone'; token: number };

export type EngineAction = InitAction | ClickAction | ResetAction | SwapAttemptAction | TickAction | SwapAnimDoneAction | SwapBackAnimDoneAction;

function pushEvents(state: EngineState, newEvents: EngineEvent[]): EngineState {
  const merged = [...state.events, ...newEvents];
  const capped = merged.length > 80 ? merged.slice(merged.length - 80) : merged;
  return { ...state, events: capped };
}

function mkSeededInit(levelId: LevelId, width: number, height: number, seed: number): EngineEvent {
  return { type: 'seededInit', levelId, width, height, seed };
}

function isSelectableCell(state: EngineState, index: number): boolean {
  const cell = state.cells[index];
  if (!cell) return false;
  if (cell.blocked) return false;
  if (cell.pieceId === null) return false;
  return true;
}

function rejectSwap(from: number, to: number, reason: SwapRejectReason): EngineEvent {
  return { type: 'swapRejected', from, to, reason };
}

function nextAnimToken(base: number): number {
  return ((base >>> 0) + 1) >>> 0;
}

function beginAnim(state: EngineState, kind: 'swap' | 'swapBack' | 'fall', durationMs: number): EngineState {
  const token = nextAnimToken(state.animToken);
  const enteredAtMs = state.nowMs;
  const deadlineAtMs = enteredAtMs + durationMs + ANIM_EPSILON_MS;

  return {
    ...state,
    animToken: token,
    anim: { kind, enteredAtMs, durationMs, deadlineAtMs, token },
  };
}

function createState(levelId: LevelId, seed: number, extraEvents: EngineEvent[] = [], animTokenBase = 0): EngineState {
  const level = getLevelDefinition(levelId);
  const built = buildInitialBoard(level, seed);

  const base: EngineState = {
    levelId,
    width: level.width,
    height: level.height,

    seed,
    rngState: built.rngState,
    allowedTypes: level.allowedTypes,

    cells: built.cells,
    pieces: built.pieces,
    nextPieceId: built.nextPieceId,

    pendingSwap: null,

    selectedIndex: null,

    phase: 'init',
    inputLocked: true,

    nowMs: 0,
    anim: null,
    animToken: animTokenBase,

    events: [mkSeededInit(levelId, level.width, level.height, seed), ...extraEvents],
  };

  const stabilized = stabilizeBoard(base);
  const withEvents = pushEvents(stabilized.state, stabilized.events);

  if (import.meta.env.DEV) assertBoardIntegrity(withEvents, 'createState');

  return withEvents;
}

export function createInitialState(levelId: LevelId): EngineState {
  const level = getLevelDefinition(levelId);
  return createState(levelId, level.baseSeed, [], 1);
}

function selectionClearedIfNeeded(prevSelected: number | null, nextSelected: number | null): EngineEvent[] {
  if (prevSelected !== null && nextSelected === null) return [{ type: 'selectionCleared' }];
  return [];
}

function applySwapCommit(state: EngineState, from: number, to: number): EngineState {
  const fromPid = state.cells[from]!.pieceId!;
  const toPid = state.cells[to]!.pieceId!;

  const nextCells = swapCellsImmutable(state.cells, from, to);
  const nextPieces = swapPiecesPositionsImmutable(state.pieces, from, to, fromPid, toPid);

  return { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };
}

function beginSwapAnimating(state: EngineState, from: number, to: number, opts?: { forceSelectionCleared?: boolean }): EngineState {
  // snapshot (for deterministic swapBack)
  const snapCells = state.cells;
  const snapPieces = state.pieces;

  const hadSelection = state.selectedIndex !== null;

  const swapped = applySwapCommit(state, from, to);

  const baseState: EngineState = {
    ...swapped,
    selectedIndex: null,
    pendingSwap: { from, to, snapCells, snapPieces },
    phase: 'swapAnimating',
    inputLocked: true,
    anim: null,
  };

  const withAnim = beginAnim(baseState, 'swap', SWAP_MS);

  const events: EngineEvent[] = [
    { type: 'phase', phase: 'swapAnimating' },
    { type: 'swap', from, to },
    ...(opts?.forceSelectionCleared || hadSelection ? [{ type: 'selectionCleared' } as const] : []),
  ];

  return pushEvents(withAnim, events);
}

function applySwapAnimDone(state: EngineState, token: number): EngineState {
  if (state.phase !== 'swapAnimating') return state;
  if (!state.pendingSwap) return state;
  if (!state.anim || state.anim.kind !== 'swap' || state.anim.token !== token) return state;

  const { from, to, snapCells, snapPieces } = state.pendingSwap;

  // outcome gate: swap must create at least one match
  const m = detectMatches(state);

  if (m.clearIndices.length === 0) {
    const revertedBase: EngineState = {
      ...state,
      cells: snapCells,
      pieces: snapPieces,
      selectedIndex: null,
      pendingSwap: null,
      phase: 'swapBackAnimating',
      inputLocked: true,
      anim: null,
    };

    const withAnim = beginAnim(revertedBase, 'swapBack', SWAP_MS);

    const withEvents = pushEvents(withAnim, [
      { type: 'phase', phase: 'resolveSwapOutcome' },
      { type: 'swapBack', from, to },
      { type: 'phase', phase: 'swapBackAnimating' },
    ]);

    if (import.meta.env.DEV) assertBoardIntegrity(withEvents, 'swapBack');

    return withEvents;
  }

  // matches exist => continue resolve chain
  const startResolve: EngineState = {
    ...state,
    pendingSwap: null,
    phase: 'inputLock',
    inputLocked: true,
    anim: null,
  };

  const seeded = pushEvents(startResolve, [{ type: 'phase', phase: 'resolveSwapOutcome' }]);

  const stabilized = stabilizeBoard(seeded);
  const final = pushEvents(stabilized.state, stabilized.events);

  if (import.meta.env.DEV) assertBoardIntegrity(final, 'swap+stabilize');

  return final;
}

function applySwapBackAnimDone(state: EngineState, token: number): EngineState {
  if (state.phase !== 'swapBackAnimating') return state;
  if (!state.anim || state.anim.kind !== 'swapBack' || state.anim.token !== token) return state;

  const next: EngineState = {
    ...state,
    phase: 'idle',
    inputLocked: false,
    anim: null,
  };

  return pushEvents(next, [{ type: 'phase', phase: 'idle' }]);
}

function tryAutoFinishAnim(state: EngineState): EngineState {
  const a = state.anim;
  if (!a) return state;

  if (state.nowMs < a.deadlineAtMs) return state;

  if (a.kind === 'swap') return applySwapAnimDone(state, a.token);
  if (a.kind === 'swapBack') return applySwapBackAnimDone(state, a.token);

  return state;
}

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'tick': {
      const incoming = Number.isFinite(action.nowMs) ? action.nowMs : state.nowMs;
      const nowMs = Math.max(state.nowMs, incoming);
      const withNow = state.nowMs === nowMs ? state : { ...state, nowMs };
      return tryAutoFinishAnim(withNow);
    }

    case 'initLevel': {
      const level = getLevelDefinition(action.levelId);
      const base = nextAnimToken(state.animToken);
      return createState(action.levelId, level.baseSeed, [], base);
    }

    case 'resetBoard': {
      if (state.phase !== 'idle') return state;

      const newSeed = ((state.seed >>> 0) + 1) >>> 0;
      const resetEvent: EngineEvent = { type: 'reset', levelId: state.levelId, seed: newSeed };
      const base = nextAnimToken(state.animToken);

      return createState(state.levelId, newSeed, [resetEvent], base);
    }

    case 'swapAttempt': {
      if (state.phase !== 'idle') return pushEvents(state, [rejectSwap(action.from, action.to, 'locked')]);

      const { from, to } = action;

      const check = canSwap(from, to, state.width, state.cells);
      if (!check.ok) return pushEvents(state, [rejectSwap(from, to, check.reason)]);

      return beginSwapAnimating(state, from, to);
    }

    case 'swapAnimDone': {
      return applySwapAnimDone(state, action.token);
    }

    case 'swapBackAnimDone': {
      return applySwapBackAnimDone(state, action.token);
    }

    case 'clickCell': {
      if (state.phase !== 'idle') return state;

      const clicked = action.index;

      if (state.selectedIndex === clicked) {
        const nextState: EngineState = { ...state, selectedIndex: null };
        return pushEvents(nextState, [{ type: 'selectionCleared' }]);
      }

      if (state.selectedIndex === null) {
        if (!isSelectableCell(state, clicked)) return state;
        const nextState: EngineState = { ...state, selectedIndex: clicked };
        return pushEvents(nextState, [{ type: 'select', index: clicked }]);
      }

      const from = state.selectedIndex;
      const to = clicked;

      const check = canSwap(from, to, state.width, state.cells);

      if (check.ok) {
        // route click-adjacent swap through the same anim pipeline
        return beginSwapAnimating(state, from, to, { forceSelectionCleared: true });
      }

      const nextSelected = isSelectableCell(state, clicked) ? clicked : null;
      const nextState: EngineState = { ...state, selectedIndex: nextSelected };

      const events: EngineEvent[] = [rejectSwap(from, to, check.reason), ...selectionClearedIfNeeded(state.selectedIndex, nextSelected)];

      if (nextSelected !== null) events.push({ type: 'select', index: nextSelected });

      return pushEvents(nextState, events);
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
