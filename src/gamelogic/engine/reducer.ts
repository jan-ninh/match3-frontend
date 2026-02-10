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

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  const withNow = (() => {
    const t = action.nowMs;
    if (typeof t !== 'number' || !Number.isFinite(t)) return state;
    const nowMs = Math.max(state.nowMs, t);
    return state.nowMs === nowMs ? state : { ...state, nowMs };
  })();

  // Auto-finish first: if deadline passed, unlock phase before processing the incoming action.
  const pre = autoFinishAll(withNow, applyDone);

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

  // If gate opened, win (after the current chain finished).
  if (final.phase === 'idle' && final.breachesRemaining <= 0 && final.gateOpen) {
    const evs: EngineEvent[] = [];
    const s = setPhase(final, 'win', evs);
    evs.push({ type: 'win' });
    final = pushEvents(s, evs);
  }
  // If we reached idle with 0 moves, end the game (after the current chain finished).
  if (final.phase === 'idle' && final.movesLeft <= 0) {
    const evs: EngineEvent[] = [];
    const s = setPhase(final, 'lose', evs);
    evs.push({ type: 'lose' });
    final = pushEvents(s, evs);
  }

  if (import.meta.env.DEV) assertPhaseInvariants(final, `engineReducer:${action.type}`);

  return final;
}
