import type { EngineEvent, EngineState, LevelId, SwapRejectReason } from './types';
import { getLevelDefinition } from './levels';
import { buildInitialBoard, canSwap, swapCellsImmutable, swapPiecesPositionsImmutable } from './board';
import { detectMatches } from './match';
import { stabilizeBoard } from './cascade';
import { assertBoardIntegrity } from './invariants';

type InitAction = { type: 'initLevel'; levelId: LevelId };
type ClickAction = { type: 'clickCell'; index: number };
type ResetAction = { type: 'resetBoard' };
type SwapAttemptAction = { type: 'swapAttempt'; from: number; to: number };

// runtime loop (scheduled by UI)
type SwapAnimDoneAction = { type: 'swapAnimDone' };
type SwapBackAnimDoneAction = { type: 'swapBackAnimDone' };

export type EngineAction = InitAction | ClickAction | ResetAction | SwapAttemptAction | SwapAnimDoneAction | SwapBackAnimDoneAction;

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

function createState(levelId: LevelId, seed: number, extraEvents: EngineEvent[] = []): EngineState {
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

    events: [mkSeededInit(levelId, level.width, level.height, seed), ...extraEvents],
  };

  const stabilized = stabilizeBoard(base);
  const withEvents = pushEvents(stabilized.state, stabilized.events);

  if (import.meta.env.DEV) assertBoardIntegrity(withEvents, 'createState');

  return withEvents;
}

export function createInitialState(levelId: LevelId): EngineState {
  const level = getLevelDefinition(levelId);
  return createState(levelId, level.baseSeed);
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

  const nextState: EngineState = {
    ...swapped,
    selectedIndex: null,
    pendingSwap: { from, to, snapCells, snapPieces },
    phase: 'swapAnimating',
    inputLocked: true,
  };

  const events: EngineEvent[] = [
    { type: 'phase', phase: 'swapAnimating' },
    { type: 'swap', from, to },
    ...(opts?.forceSelectionCleared || hadSelection ? [{ type: 'selectionCleared' } as const] : []),
  ];

  return pushEvents(nextState, events);
}

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'initLevel': {
      return createInitialState(action.levelId);
    }

    case 'resetBoard': {
      if (state.phase !== 'idle') return state;

      const newSeed = ((state.seed >>> 0) + 1) >>> 0;
      const resetEvent: EngineEvent = { type: 'reset', levelId: state.levelId, seed: newSeed };
      return createState(state.levelId, newSeed, [resetEvent]);
    }

    case 'swapAttempt': {
      if (state.phase !== 'idle') return pushEvents(state, [rejectSwap(action.from, action.to, 'locked')]);

      const { from, to } = action;

      const check = canSwap(from, to, state.width, state.cells);
      if (!check.ok) return pushEvents(state, [rejectSwap(from, to, check.reason)]);

      return beginSwapAnimating(state, from, to);
    }

    case 'swapAnimDone': {
      if (state.phase !== 'swapAnimating') return state;
      if (!state.pendingSwap) return state;

      const { from, to, snapCells, snapPieces } = state.pendingSwap;

      // outcome gate: swap must create at least one match
      const m = detectMatches(state);

      if (m.clearIndices.length === 0) {
        const reverted: EngineState = {
          ...state,
          cells: snapCells,
          pieces: snapPieces,
          selectedIndex: null,
          pendingSwap: null,
          phase: 'swapBackAnimating',
          inputLocked: true,
        };

        const withEvents = pushEvents(reverted, [
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
      };

      const seeded = pushEvents(startResolve, [{ type: 'phase', phase: 'resolveSwapOutcome' }]);

      const stabilized = stabilizeBoard(seeded);
      const final = pushEvents(stabilized.state, stabilized.events);

      if (import.meta.env.DEV) assertBoardIntegrity(final, 'swap+stabilize');

      return final;
    }

    case 'swapBackAnimDone': {
      if (state.phase !== 'swapBackAnimating') return state;

      const next: EngineState = {
        ...state,
        phase: 'idle',
        inputLocked: false,
      };

      return pushEvents(next, [{ type: 'phase', phase: 'idle' }]);
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
