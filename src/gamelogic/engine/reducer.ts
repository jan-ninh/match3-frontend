// src/gamelogic/engine/reducer.ts
import type { EngineEvent, EngineState, LevelId } from '../types';
import { getLevelDefinition } from '../levels';
import { canSwap } from '../board';
import { assertPhaseInvariants } from '../invariants';
import { setPhase } from '../phaseState';

import { nextAnimToken, sanitizeSwapMs } from './anim';
import { autoFinishAll } from './autoFinish';
import { pushEvents, rejectSwap } from './events';
import { isSelectableCell, selectionClearedIfNeeded } from './guards';
import { createState } from './state';
import { applySwapAnimDone, applySwapBackAnimDone, beginSwapAnimating } from './swapFlow';
import { applyFallAnimDone } from './fallFlow';
import { applyTurnEndEffects } from './turnEnd';
import { processKeycardDeliveries } from './deliveryFlow';

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

// optional UI "done" signals (never the only escape hatch)
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

type DoneKind = 'swap' | 'swapBack' | 'fall';
type SwapDoneMode = Parameters<typeof applySwapAnimDone>[2];
type SwapBackDoneMode = Parameters<typeof applySwapBackAnimDone>[2];
type FallDoneMode = Parameters<typeof applyFallAnimDone>[2];
type DoneMode = SwapDoneMode | SwapBackDoneMode | FallDoneMode;

const applyDone = (st: EngineState, kind: DoneKind, tok: number, mode: DoneMode): EngineState => {
  switch (kind) {
    case 'swap':
      return applySwapAnimDone(st, tok, mode as SwapDoneMode);
    case 'swapBack':
      return applySwapBackAnimDone(st, tok, mode as SwapBackDoneMode);
    case 'fall':
      return applyFallAnimDone(st, tok, mode as FallDoneMode);
    default:
      throw new Error(`Unhandled done kind: ${kind}`);
  }
};

// ─────────────────────────────────────────────
// Win/Lose Condition Checks
// ─────────────────────────────────────────────

function checkWinConditions(state: EngineState): 'gate' | 'leaks' | 'terminals' | null {
  // Level 01: Gate win (all firewalls breached)
  if (state.breachesRemaining <= 0 && state.gateOpen && state.breachesTotal > 0) {
    return 'gate';
  }

  // Level 02+: Leak win (all leaks sealed)
  if (state.leaksTotal > 0 && state.leaksSealed >= state.leaksTotal) {
    return 'leaks';
  }

  // Level 03+: Terminal win (all terminals verified)
  if (state.terminalsTotal > 0 && state.terminalsVerified >= state.terminalsTotal) {
    return 'terminals';
  }

  return null;
}

function checkLoseConditions(state: EngineState): 'moves' | 'contamination' | null {
  // Out of moves
  if (state.movesLeft <= 0) {
    return 'moves';
  }

  // Contamination threshold (Level 02+)
  if (state.contaminationLoseThreshold !== null) {
    let contaminationCount = 0;
    for (const cell of state.cells) {
      if (cell.obstacle?.kind === 'contamination') {
        contaminationCount++;
      }
    }
    if (contaminationCount >= state.contaminationLoseThreshold) {
      return 'contamination';
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// Apply Turn End (called when reaching idle after a successful swap)
// ─────────────────────────────────────────────

function maybeApplyTurnEnd(state: EngineState, wasSuccessfulSwap: boolean): EngineState {
  // Only apply turn end effects after a successful swap that created matches
  if (!wasSuccessfulSwap) return state;

  let s = state;

  // Level 02: Leak mechanics
  if (s.leaksTotal > 0) {
    const result = applyTurnEndEffects(s);
    s = pushEvents(result.state, result.events);

    // Check for leak win
    if (result.leakWin) {
      const evs: EngineEvent[] = [];
      s = setPhase(s, 'win', evs);
      evs.push({ type: 'win' });
      return pushEvents(s, evs);
    }

    // Check for contamination lose
    if (result.contaminationLose) {
      const evs: EngineEvent[] = [];
      s = setPhase(s, 'lose', evs);
      evs.push({ type: 'lose' });
      return pushEvents(s, evs);
    }
  }

  // Level 03+: Process keycard deliveries
  if (s.terminalsTotal > 0) {
    const deliveryResult = processKeycardDeliveries(s);
    s = pushEvents(deliveryResult.state, deliveryResult.events);
  }

  return s;
}

// ─────────────────────────────────────────────
// Main Reducer
// ─────────────────────────────────────────────

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  const withNow = (() => {
    const t = action.nowMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) return state;
    const nowMs = Math.max(state.nowMs, t);
    return state.nowMs === nowMs ? state : { ...state, nowMs };
  })();

  // Auto-finish first: if deadline passed, unlock phase before processing the incoming action.
  const pre = autoFinishAll(withNow, applyDone);

  // Track if we were in a state that could lead to turn end
  const wasAnimating = pre.phase === 'fallAnimating' || pre.phase === 'swapAnimating';

  const next = (() => {
    const s = pre;

    switch (action.type) {
      case 'tick':
      case 'wake': {
        return s;
      }

      case 'setSwapMs': {
        const nextSwapMs = sanitizeSwapMs(action.swapMs);
        if (s.swapMs === nextSwapMs) return s;

        let nextState: EngineState = { ...s, swapMs: nextSwapMs };

        // reduced motion toggle while animating => force immediate finish (no drift window)
        if (nextSwapMs === 0 && nextState.anim) {
          const a = nextState.anim;
          nextState = { ...nextState, anim: { ...a, durationMs: 0, deadlineAtMs: a.enteredAtMs } };
          return autoFinishAll(nextState, applyDone);
        }

        return nextState;
      }

      case 'initLevel': {
        const level = getLevelDefinition(action.levelId);
        const base = nextAnimToken(s.animToken);
        return createState(action.levelId, level.baseSeed, [], base, s.swapMs);
      }

      case 'resetBoard': {
        if (s.phase !== 'idle') return s;

        const newSeed = ((s.seed >>> 0) + 1) >>> 0;
        const resetEvent: EngineEvent = { type: 'reset', levelId: s.levelId, seed: newSeed };
        const base = nextAnimToken(s.animToken);

        return createState(s.levelId, newSeed, [resetEvent], base, s.swapMs);
      }

      case 'swapAttempt': {
        if (s.phase !== 'idle') return pushEvents(s, [rejectSwap(action.from, action.to, 'locked')]);

        const { from, to } = action;

        const check = canSwap(from, to, s.width, s.cells);
        if (!check.ok) return pushEvents(s, [rejectSwap(from, to, check.reason)]);

        return beginSwapAnimating(s, from, to);
      }

      case 'swapAnimDone': {
        return applySwapAnimDone(s, action.token, 'early');
      }

      case 'swapBackAnimDone': {
        return applySwapBackAnimDone(s, action.token, 'early');
      }

      case 'fallAnimDone': {
        return applyFallAnimDone(s, action.token, 'early');
      }

      case 'clickCell': {
        if (s.phase !== 'idle') return s;

        const clicked = action.index;

        if (s.selectedIndex === clicked) {
          const nextState: EngineState = { ...s, selectedIndex: null };
          return pushEvents(nextState, [{ type: 'selectionCleared' }]);
        }

        if (s.selectedIndex === null) {
          if (!isSelectableCell(s, clicked)) return s;
          const nextState: EngineState = { ...s, selectedIndex: clicked };
          return pushEvents(nextState, [{ type: 'select', index: clicked }]);
        }

        const from = s.selectedIndex;
        const to = clicked;

        const check = canSwap(from, to, s.width, s.cells);

        if (check.ok) {
          // route click-adjacent swap through the same anim pipeline
          return beginSwapAnimating(s, from, to, { forceSelectionCleared: true });
        }

        const nextSelected = isSelectableCell(s, clicked) ? clicked : null;
        const nextState: EngineState = { ...s, selectedIndex: nextSelected };

        const events: EngineEvent[] = [rejectSwap(from, to, check.reason), ...selectionClearedIfNeeded(s.selectedIndex, nextSelected)];

        if (nextSelected !== null) events.push({ type: 'select', index: nextSelected });

        return pushEvents(nextState, events);
      }

      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
      }
    }
  })();

  let final = next;

  // Apply turn end effects if we just transitioned to idle after animations
  const justReachedIdle = final.phase === 'idle' && wasAnimating;
  if (justReachedIdle) {
    // Check if this was a successful swap (moves were spent)
    const movesWereSpent = final.movesLeft < state.movesLeft;
    final = maybeApplyTurnEnd(final, movesWereSpent);
  }

  // Check win conditions
  if (final.phase === 'idle') {
    const winReason = checkWinConditions(final);
    if (winReason) {
      const evs: EngineEvent[] = [];
      const s = setPhase(final, 'win', evs);
      evs.push({ type: 'win' });
      final = pushEvents(s, evs);
    }
  }

  // Check lose conditions
  if (final.phase === 'idle') {
    const loseReason = checkLoseConditions(final);
    if (loseReason) {
      const evs: EngineEvent[] = [];
      const s = setPhase(final, 'lose', evs);
      evs.push({ type: 'lose' });
      final = pushEvents(s, evs);
    }
  }

  if (import.meta.env.DEV) assertPhaseInvariants(final, `engineReducer:${action.type}`);

  return final;
}
