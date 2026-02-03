import type { EngineEvent, EngineState, LevelId, SwapRejectReason } from './types';
import { getLevelDefinition } from './levels';
import { buildInitialBoard, canSwap, swapCellsImmutable, swapPiecesPositionsImmutable } from './board';

type InitAction = { type: 'initLevel'; levelId: LevelId };
type ClickAction = { type: 'clickCell'; index: number };
type ResetAction = { type: 'resetBoard' };
type SwapAttemptAction = { type: 'swapAttempt'; from: number; to: number };

export type EngineAction = InitAction | ClickAction | ResetAction | SwapAttemptAction;

function pushEvents(state: EngineState, newEvents: EngineEvent[]): EngineState {
  const merged = [...state.events, ...newEvents];
  const capped = merged.length > 80 ? merged.slice(merged.length - 80) : merged;
  return { ...state, events: capped };
}

export function createInitialState(levelId: LevelId): EngineState {
  const level = getLevelDefinition(levelId);
  const { cells, pieces, nextPieceId } = buildInitialBoard(level);

  const seededInit: EngineEvent = {
    type: 'seededInit',
    levelId,
    width: level.width,
    height: level.height,
    seed: level.baseSeed,
  };

  return {
    levelId,
    width: level.width,
    height: level.height,
    seed: level.baseSeed,
    cells,
    pieces,
    nextPieceId,
    selectedIndex: null,
    events: [seededInit],
  };
}

function selectionClearedIfNeeded(prevSelected: number | null, nextSelected: number | null): EngineEvent[] {
  if (prevSelected !== null && nextSelected === null) return [{ type: 'selectionCleared' }];
  return [];
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

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'initLevel': {
      return createInitialState(action.levelId);
    }

    case 'resetBoard': {
      return createInitialState(state.levelId);
    }

    case 'swapAttempt': {
      const { from, to } = action;

      const check = canSwap(from, to, state.width, state.cells);

      if (check.ok) {
        const fromPid = state.cells[from]!.pieceId!;
        const toPid = state.cells[to]!.pieceId!;

        const nextCells = swapCellsImmutable(state.cells, from, to);
        const nextPieces = swapPiecesPositionsImmutable(state.pieces, from, to, fromPid, toPid);

        const hadSelection = state.selectedIndex !== null;

        const nextState: EngineState = { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };

        const events: EngineEvent[] = [{ type: 'swap', from, to }];
        if (hadSelection) events.push({ type: 'selectionCleared' });

        return pushEvents(nextState, events);
      }

      return pushEvents(state, [rejectSwap(from, to, check.reason)]);
    }

    case 'clickCell': {
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
        const fromPid = state.cells[from]!.pieceId!;
        const toPid = state.cells[to]!.pieceId!;

        const nextCells = swapCellsImmutable(state.cells, from, to);
        const nextPieces = swapPiecesPositionsImmutable(state.pieces, from, to, fromPid, toPid);

        const nextState: EngineState = { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };

        return pushEvents(nextState, [{ type: 'swap', from, to }, { type: 'selectionCleared' }]);
      }

      const nextSelected = isSelectableCell(state, clicked) ? clicked : null;

      const nextState: EngineState = { ...state, selectedIndex: nextSelected };

      const events: EngineEvent[] = [rejectSwap(from, to, check.reason), ...selectionClearedIfNeeded(state.selectedIndex, nextSelected)];

      if (nextSelected !== null) {
        events.push({ type: 'select', index: nextSelected });
      }

      return pushEvents(nextState, events);
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
