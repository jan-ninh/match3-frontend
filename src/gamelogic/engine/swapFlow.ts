import type { AnimDoneIgnoreReason, AnimDoneMode, EngineEvent, EngineState } from '../types';
import { swapCellsImmutable, swapPiecesPositionsImmutable } from '../board';
import { detectMatches } from '../match';
import { resolveOnce } from '../cascade';
import { assertBoardIntegrity, assertPhaseInvariants } from '../invariants';
import { setPhase } from '../phaseState';

import { beginAnim } from './anim';
import { autoFinishAll } from './autoFinish';
import { mkAnimDone, mkAnimDoneIgnored, pushEvents } from './events';
import { applyFallAnimDone } from './fallFlow';
import type { ApplyAnimDone } from './autoFinish';

function applySwapCommit(state: EngineState, from: number, to: number): EngineState {
  const fromPid = state.cells[from]!.pieceId!;
  const toPid = state.cells[to]!.pieceId!;

  const nextCells = swapCellsImmutable(state.cells, from, to);
  const nextPieces = swapPiecesPositionsImmutable(state.pieces, from, to, fromPid, toPid);

  return { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };
}

const applyDone: ApplyAnimDone = (st, kind, tok, mode) => {
  if (kind === 'swap') return applySwapAnimDone(st, tok, mode);
  if (kind === 'swapBack') return applySwapBackAnimDone(st, tok, mode);
  if (kind === 'fall') return applyFallAnimDone(st, tok, mode);
  return st;
};

export function beginSwapAnimating(state: EngineState, from: number, to: number, opts?: { forceSelectionCleared?: boolean }): EngineState {
  // snapshot (for deterministic swapBack)
  const snapCells = state.cells;
  const snapPieces = state.pieces;

  const hadSelection = state.selectedIndex !== null;

  const swapped = applySwapCommit(state, from, to);

  // moves are spent only if the swap actually creates a match (see applySwapAnimDone)
  const events: EngineEvent[] = [];

  let baseState: EngineState = {
    ...swapped,
    selectedIndex: null,
    pendingSwap: { from, to, snapCells, snapPieces },
    pendingTurnCommit: null, // defensive: clear any stale commit
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
    return autoFinishAll(afterSwap, applyDone);
  }

  return seeded;
}

export function applySwapAnimDone(state: EngineState, token: number, mode: AnimDoneMode): EngineState {
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
      pendingTurnCommit: null, // no match => no turn commit
      anim: null,
    };

    revertedBase = setPhase(revertedBase, 'swapBackAnimating', events);

    //Testing SwapBack
    const SWAP_BACK_FACTOR = 0.4;
    const SWAP_BACK_MIN_MS = 80;
    const swapBackMs =
      revertedBase.swapMs === 0 ? 0 : Math.min(revertedBase.swapMs, Math.max(SWAP_BACK_MIN_MS, Math.round(revertedBase.swapMs * SWAP_BACK_FACTOR)));
    const withAnim = beginAnim(revertedBase, 'swapBack', swapBackMs);
    events.push({ type: 'swapBack', from, to });

    const withEvents = pushEvents(withAnim, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'swapBack');
      assertPhaseInvariants(withEvents, 'swapBack');
    }

    if (withEvents.anim?.durationMs === 0) return autoFinishAll(withEvents, applyDone);
    return withEvents;
  }

  // matches exist => resolve once, then wait for falling animation
  const events: EngineEvent[] = [doneEvent];

  // spend a move only if the swap actually creates a match
  const nextMovesLeft = Math.max(0, state.movesLeft - 1);
  const didSpendMove = nextMovesLeft !== state.movesLeft;
  if (didSpendMove) events.push({ type: 'movesSpent', left: nextMovesLeft });

  let s: EngineState = {
    ...state,
    movesLeft: nextMovesLeft,
    pendingSwap: null,
    anim: null,
  };

  s = setPhase(s, 'inputLock', events);

  // arm commit only after match-confirmation (swapBack-safe)
  s = { ...s, pendingTurnCommit: { kind: 'swap', spendMove: didSpendMove } };
  events.push({ type: 'turnCommitArmed', kind: 'swap', spendMove: didSpendMove, from, to });

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
  if (withEvents.anim?.durationMs === 0) return autoFinishAll(withEvents, applyDone);

  return withEvents;
}

export function applySwapBackAnimDone(state: EngineState, token: number, mode: AnimDoneMode): EngineState {
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

  const base: EngineState = { ...state, anim: null, pendingTurnCommit: null };
  const next = setPhase(base, 'idle', events);

  return pushEvents(next, events);
}
