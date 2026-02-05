import type { AnimDoneIgnoreReason, AnimDoneMode, EngineAnimKind, EngineEvent, EngineState, LevelId, SwapRejectReason } from './types';
import { getLevelDefinition } from './levels';
import { buildInitialBoard, canSwap, swapCellsImmutable, swapPiecesPositionsImmutable } from './board';
import { detectMatches, hasAnyMoves } from './match';
import { resolveOnce, shuffleUntilValid, stabilizeBoard } from './cascade';
import { assertBoardIntegrity, assertPhaseInvariants } from './invariants';
import { ANIM_EPSILON_MS, SWAP_MS } from './animTimings';
import { setPhase } from './phaseState';

type InitAction = { type: 'initLevel'; levelId: LevelId; nowMs?: number };
type ClickAction = { type: 'clickCell'; index: number; nowMs?: number };
type ResetAction = { type: 'resetBoard'; nowMs?: number };
type SwapAttemptAction = { type: 'swapAttempt'; from: number; to: number; nowMs?: number };

// animation timing (single source of truth; UI may update via setSwapMs)
type SetSwapMsAction = { type: 'setSwapMs'; swapMs: number; nowMs?: number };

// time injection / wake-up (no-op except nowMs + auto-finish)
type WakeAction = { type: 'wake'; nowMs: number };

// engine-owned time
type TickAction = { type: 'tick'; nowMs: number };

// optional UI “done” signals (never the only escape hatch)
type SwapAnimDoneAction = { type: 'swapAnimDone'; token: number; nowMs?: number };
type SwapBackAnimDoneAction = { type: 'swapBackAnimDone'; token: number; nowMs?: number };
type FallAnimDoneAction = { type: 'fallAnimDone'; token: number; nowMs?: number };


export type EngineAction =
  | InitAction
  | ClickAction
  | ResetAction
  | SwapAttemptAction
  | SetSwapMsAction
  | WakeAction
  | TickAction
  | SwapAnimDoneAction
  | SwapBackAnimDoneAction
  | FallAnimDoneAction;

function pushEvents(state: EngineState, newEvents: EngineEvent[]): EngineState {
  const merged = [...state.events, ...newEvents];
  const capped = merged.length > 80 ? merged.slice(merged.length - 80) : merged;
  return { ...state, events: capped };
}

function mkSeededInit(levelId: LevelId, width: number, height: number, seed: number): EngineEvent {
  return { type: 'seededInit', levelId, width, height, seed };
}

function mkAnimDone(mode: AnimDoneMode, anim: { kind: EngineAnimKind; enteredAtMs: number; durationMs: number; token: number }, nowMs: number): EngineEvent {
  const dtMs = Math.max(0, nowMs - anim.enteredAtMs);
  const deltaMs = dtMs - anim.durationMs; // negative = early, positive = late
  return { type: 'animDone', mode, kind: anim.kind, token: anim.token, dtMs, deltaMs };
}

function mkAnimDoneIgnored(kind: EngineAnimKind, token: number, reason: AnimDoneIgnoreReason): EngineEvent {
  return { type: 'animDoneIgnored', kind, token, reason };
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

function sanitizeSwapMs(v: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return SWAP_MS;
  return Math.max(0, Math.round(v));
}

function beginAnim(state: EngineState, kind: EngineAnimKind, durationMs: number): EngineState {
  const token = nextAnimToken(state.animToken);
  const enteredAtMs = state.nowMs;
  const epsilon = durationMs > 0 ? ANIM_EPSILON_MS : 0;
  const deadlineAtMs = enteredAtMs + durationMs + epsilon;

  return {
    ...state,
    animToken: token,
    anim: { kind, enteredAtMs, durationMs, deadlineAtMs, token },
  };
}

function createState(levelId: LevelId, seed: number, extraEvents: EngineEvent[] = [], animTokenBase = 0, swapMs = SWAP_MS): EngineState {
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

  const events: EngineEvent[] = [];

  let baseState: EngineState = {
    ...swapped,
    selectedIndex: null,
    pendingSwap: { from, to, snapCells, snapPieces },
    anim: null,
  };

  baseState = setPhase(baseState, 'swapAnimating', events);

  const withAnim = beginAnim(baseState, 'swap', baseState.swapMs);

  events.push({ type: 'swap', from, to });
  if (opts?.forceSelectionCleared || hadSelection) events.push({ type: 'selectionCleared' });

  const seeded = pushEvents(withAnim, events);

  // reduced motion / 0ms => no wait phase: finish inside the same reducer turn
  const a = seeded.anim;
  if (a && a.durationMs === 0) {
    const afterSwap = applySwapAnimDone(seeded, a.token, 'auto');
    return autoFinishAll(afterSwap);
  }

  return seeded;
}

function applySwapAnimDone(state: EngineState, token: number, mode: AnimDoneMode): EngineState {
  const ignore = (reason: AnimDoneIgnoreReason): EngineState => {
    if (mode !== 'early') return state;
    if (!import.meta.env.DEV) return state;
    return pushEvents(state, [mkAnimDoneIgnored('swap', token, reason)]);
  };

  if (state.phase !== 'swapAnimating') return ignore('wrongPhase');
  if (!state.pendingSwap) return ignore('missingPendingSwap');

  const a = state.anim;
  if (!a) return ignore('missingAnim');
  if (a.kind !== 'swap') return ignore('wrongKind');
  if (a.token !== token) return ignore('wrongToken');

  const doneEvent = mkAnimDone(mode, a, state.nowMs);
  const { from, to, snapCells, snapPieces } = state.pendingSwap;

  // outcome gate: swap must create at least one match
  const m = detectMatches(state);

  if (m.clearIndices.length === 0) {
    const events: EngineEvent[] = [doneEvent];

    let revertedBase: EngineState = {
      ...state,
      cells: snapCells,
      pieces: snapPieces,
      selectedIndex: null,
      pendingSwap: null,
      anim: null,
    };

    revertedBase = setPhase(revertedBase, 'swapBackAnimating', events);

    const withAnim = beginAnim(revertedBase, 'swapBack', revertedBase.swapMs);
    events.push({ type: 'swapBack', from, to });

    const withEvents = pushEvents(withAnim, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'swapBack');
      assertPhaseInvariants(withEvents, 'swapBack');
    }

    return withEvents;
  }

  // matches exist => resolve once, then wait for falling animation
  const events: EngineEvent[] = [doneEvent];

  let s: EngineState = {
    ...state,
    pendingSwap: null,
    anim: null,
  };

  s = setPhase(s, 'inputLock', events);

  const step = resolveOnce(s);
  s = step.state;
  events.push(...step.events);

  // unexpected: nothing to resolve => go idle
  if (!step.didResolve) {
    s = setPhase(s, 'idle', events);
    return pushEvents(s, events);
  }

  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  const withEvents = pushEvents(s, events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(withEvents, 'swap+resolveOnce+fall');
    assertPhaseInvariants(withEvents, 'swap+resolveOnce+fall');
  }

  // reduced motion => finish immediately
  if (withEvents.anim?.durationMs === 0) return autoFinishAll(withEvents);

  return withEvents;
}

function applySwapBackAnimDone(state: EngineState, token: number, mode: AnimDoneMode): EngineState {
  const ignore = (reason: AnimDoneIgnoreReason): EngineState => {
    if (mode !== 'early') return state;
    if (!import.meta.env.DEV) return state;
    return pushEvents(state, [mkAnimDoneIgnored('swapBack', token, reason)]);
  };

  if (state.phase !== 'swapBackAnimating') return ignore('wrongPhase');

  const a = state.anim;
  if (!a) return ignore('missingAnim');
  if (a.kind !== 'swapBack') return ignore('wrongKind');
  if (a.token !== token) return ignore('wrongToken');

  const events: EngineEvent[] = [mkAnimDone(mode, a, state.nowMs)];

  const base: EngineState = { ...state, anim: null };
  const next = setPhase(base, 'idle', events);

  return pushEvents(next, events);
}

function applyFallAnimDone(state: EngineState, token: number, mode: AnimDoneMode): EngineState {
  const ignore = (reason: AnimDoneIgnoreReason): EngineState => {
    if (mode !== 'early') return state;
    if (!import.meta.env.DEV) return state;
    return pushEvents(state, [mkAnimDoneIgnored('fall', token, reason)]);
  };

  if (state.phase !== 'fallAnimating') return ignore('wrongPhase');

  const a = state.anim;
  if (!a) return ignore('missingAnim');
  if (a.kind !== 'fall') return ignore('wrongKind');
  if (a.token !== token) return ignore('wrongToken');

  const doneEvent = mkAnimDone(mode, a, state.nowMs);

  const events: EngineEvent[] = [doneEvent];

  let s: EngineState = { ...state, anim: null };

  // continue resolve chain (if any)
  s = setPhase(s, 'inputLock', events);

  const step = resolveOnce(s);
  s = step.state;
  events.push(...step.events);

  if (step.didResolve) {
    s = setPhase(s, 'fallAnimating', events);
    s = beginAnim(s, 'fall', s.swapMs);

    const withEvents = pushEvents(s, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'fall+resolveOnce');
      assertPhaseInvariants(withEvents, 'fall+resolveOnce');
    }

    if (withEvents.anim?.durationMs === 0) return autoFinishAll(withEvents);
    return withEvents;
  }

  // no matches => deadlock check
  s = setPhase(s, 'deadlockCheck', events);
  const hasMove = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove });

  if (hasMove) {
    s = setPhase(s, 'idle', events);
    const withEvents = pushEvents(s, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'fall->idle');
      assertPhaseInvariants(withEvents, 'fall->idle');
    }

    return withEvents;
  }

  // deadlock => shuffle (instant)
  s = setPhase(s, 'shuffle', events);
  const sh = shuffleUntilValid(s, 200);
  s = sh.state;
  events.push({ type: 'shuffled', attempts: sh.attempts });

  // if shuffle produced matches, resolve once and animate
  const post = resolveOnce(s);
  s = post.state;
  events.push(...post.events);

  if (post.didResolve) {
    s = setPhase(s, 'fallAnimating', events);
    s = beginAnim(s, 'fall', s.swapMs);

    const withEvents = pushEvents(s, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'shuffle->resolveOnce+fall');
      assertPhaseInvariants(withEvents, 'shuffle->resolveOnce+fall');
    }

    if (withEvents.anim?.durationMs === 0) return autoFinishAll(withEvents);
    return withEvents;
  }

  // SECOND deadlock check after post-resolve (guarantee playable)
  s = setPhase(s, 'deadlockCheck', events);
  const hasMove2 = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove: hasMove2 });

  if (!hasMove2) {
    // last resort: full stabilize
    const stabilized = stabilizeBoard(s, { maxShuffleAttempts: 400 });
    const allEvents: EngineEvent[] = [...events, ...stabilized.events];
    const merged = pushEvents(stabilized.state, allEvents);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(merged, 'shuffle->stabilize');
      assertPhaseInvariants(merged, 'shuffle->stabilize');
    }

    return merged;
  }

  s = setPhase(s, 'idle', events);
  const final = pushEvents(s, events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(final, 'fall->shuffle->idle');
    assertPhaseInvariants(final, 'fall->shuffle->idle');
  }

  return final;
}

function tryAutoFinishAnim(state: EngineState): EngineState {
  const a = state.anim;
  if (!a) return state;

  if (state.nowMs < a.deadlineAtMs) return state;

  if (a.kind === 'swap') return applySwapAnimDone(state, a.token, 'auto');
  if (a.kind === 'swapBack') return applySwapBackAnimDone(state, a.token, 'auto');
  if (a.kind === 'fall') return applyFallAnimDone(state, a.token, 'auto');

  return state;
}

function autoFinishAll(state: EngineState): EngineState {
  // bounded loop to avoid infinite locks if a bug slips in
  let s = state;
  for (let i = 0; i < 128; i++) {
    const next = tryAutoFinishAnim(s);
    if (next === s) break;
    s = next;
  }
  return s;
}
export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  const withNow = (() => {
    const t = action.nowMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) return state;
    const nowMs = Math.max(state.nowMs, t);
    return state.nowMs === nowMs ? state : { ...state, nowMs };
  })();

  // Auto-finish first: if deadline passed, unlock phase before processing the incoming action.
  const pre = autoFinishAll(withNow);

  const next = (() => {
    const state = pre;

    switch (action.type) {
      case 'tick':
      case 'wake': {
        return state;
      }

      case 'setSwapMs': {
        const nextSwapMs = sanitizeSwapMs(action.swapMs);
        if (state.swapMs === nextSwapMs) return state;

        let nextState: EngineState = { ...state, swapMs: nextSwapMs };

        // reduced motion toggle while animating => force immediate finish (no drift window)
        if (nextSwapMs === 0 && nextState.anim) {
          const a = nextState.anim;
          nextState = { ...nextState, anim: { ...a, durationMs: 0, deadlineAtMs: a.enteredAtMs } };
          return autoFinishAll(nextState);
        }

        return nextState;
      }

      case 'initLevel': {
        const level = getLevelDefinition(action.levelId);
        const base = nextAnimToken(state.animToken);
        return createState(action.levelId, level.baseSeed, [], base, state.swapMs);
      }

      case 'resetBoard': {
        if (state.phase !== 'idle') return state;

        const newSeed = ((state.seed >>> 0) + 1) >>> 0;
        const resetEvent: EngineEvent = { type: 'reset', levelId: state.levelId, seed: newSeed };
        const base = nextAnimToken(state.animToken);

        return createState(state.levelId, newSeed, [resetEvent], base, state.swapMs);
      }

      case 'swapAttempt': {
        if (state.phase !== 'idle') return pushEvents(state, [rejectSwap(action.from, action.to, 'locked')]);

        const { from, to } = action;

        const check = canSwap(from, to, state.width, state.cells);
        if (!check.ok) return pushEvents(state, [rejectSwap(from, to, check.reason)]);

        return beginSwapAnimating(state, from, to);
      }

      case 'swapAnimDone': {
        return applySwapAnimDone(state, action.token, 'early');
      }

      case 'swapBackAnimDone': {
        return applySwapBackAnimDone(state, action.token, 'early');
      }

            case 'fallAnimDone': {
        return applyFallAnimDone(state, action.token, 'early');
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
  })();

  if (import.meta.env.DEV) assertPhaseInvariants(next, `engineReducer:${action.type}`);

  return next;
}


