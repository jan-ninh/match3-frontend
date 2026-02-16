import type { EngineState } from '../../types';
import { assertPhaseInvariants } from '../../invariants';

import type { EngineAction, InitLevelAction, ResetBoardAction } from './actions';
import { applyDone } from './applyDone';
import { preAutoFinish } from './preAutoFinish';
import { withNow } from './withNow';

import { handleAnimDone } from './handlers/handleAnimDone';
import { handleClickCell } from './handlers/handleClickCell';
import { handleInitLevel } from './handlers/handleInitLevel';
import { handleResetBoard } from './handlers/handleResetBoard';
import { handleReshuffle } from './handlers/handleReshuffle';
import { handleSetSwapMs } from './handlers/handleSetSwapMs';
import { handleSwapAttempt } from './handlers/handleSwapAttempt';
import { handleTickWake } from './handlers/handleTickWake';
import { handleUseItemAt } from './handlers/handleUseItemAt';

import { applyTurnEndPipeline } from './post/applyTurnEndPipeline';
import { resolveOutcomeIfIdle } from './post/resolveOutcome';

import { isStableIdle, mkTurnEndComplete, mkTurnEndStart, mkTurnSeparator, pushEvents } from '../events';

type EngineReducerAction = EngineAction;
type PriorityAction = InitLevelAction | ResetBoardAction;
type NonPriorityAction = Exclude<EngineReducerAction, PriorityAction>;

export function engineReducer(state: EngineState, action: EngineReducerAction): EngineState {
  // Step 1: withNow first — obtain monotonic nowMs for all paths
  const sNow = withNow(state, action);

  // Step 2: Priority actions (initLevel/resetBoard) bypass preAutoFinish entirely.
  // Rationale: preAutoFinish processes anims on state that will be discarded.
  if (action.type === 'initLevel') {
    const result = emitSeparatorIfNeeded(state, handleInitLevel(sNow, action));

    if (import.meta.env.DEV) assertPhaseInvariants(result, `engineReducer:${action.type}`);

    // Fresh state from createState is always stableIdle-eligible after stabilizeBoard.
    // Emit turnSeparator if the transition qualifies.
    return result;
  }

  if (action.type === 'resetBoard') {
    const result = emitSeparatorIfNeeded(state, handleResetBoard(sNow, action));

    if (import.meta.env.DEV) assertPhaseInvariants(result, `engineReducer:${action.type}`);

    return result;
  }

  // From here on, only non-priority actions remain.
  const nonPriorityAction: NonPriorityAction = action;

  // Step 3: Normal path — auto-finish if deadline passed before processing incoming action
  const pre = preAutoFinish(sNow, applyDone);

  const next = (() => {
    const s = pre.state;

    switch (nonPriorityAction.type) {
      case 'tick':
      case 'wake': {
        return handleTickWake(s, nonPriorityAction);
      }

      case 'setSwapMs': {
        return handleSetSwapMs(s, nonPriorityAction, applyDone);
      }

      case 'swapAttempt': {
        return handleSwapAttempt(s, nonPriorityAction);
      }

      case 'swapAnimDone':
      case 'swapBackAnimDone':
      case 'fallAnimDone': {
        return handleAnimDone(s, nonPriorityAction);
      }

      case 'clickCell': {
        return handleClickCell(s, nonPriorityAction);
      }

      case 'useItemAt': {
        return handleUseItemAt(s, nonPriorityAction);
      }

      case 'reshuffle': {
        return handleReshuffle(s, nonPriorityAction);
      }

      default: {
        const _exhaustive: never = nonPriorityAction;
        throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
      }
    }
  })();

  let final = next;

  // Step 4: Turn-end is engine-owned: apply only when idle AND a commit exists.
  if (final.phase === 'idle' && final.pendingTurnCommit !== null) {
    const commit = final.pendingTurnCommit;

    // Observability: bracket turn-end pipeline
    final = pushEvents(final, [mkTurnEndStart(commit.kind, commit.spendMove)]);

    final = applyTurnEndPipeline(final, commit);

    // Single-shot: always consume (also if pipeline decides "no turn-end" for swap spendMove=false)
    final = { ...final, pendingTurnCommit: null };

    final = pushEvents(final, [mkTurnEndComplete()]);
  }

  // Step 5: Resolve win/lose only when idle (win has precedence over lose)
  final = resolveOutcomeIfIdle(final);

  // Step 6: Emit turnSeparator on (!prevStableIdle && nextStableIdle)
  final = emitSeparatorIfNeeded(state, final);

  if (import.meta.env.DEV) assertPhaseInvariants(final, `engineReducer:${action.type}`);

  return final;
}

/**
 * Emit turnSeparator exactly on the transition (!prevStableIdle && nextStableIdle).
 * Uses isStableIdle as SSOT. Emitted via pushEvents (respects event cap).
 */
function emitSeparatorIfNeeded(prev: EngineState, next: EngineState): EngineState {
  const prevStable = isStableIdle(prev);
  const nextStable = isStableIdle(next);

  if (!prevStable && nextStable) {
    return pushEvents(next, [mkTurnSeparator()]);
  }

  return next;
}

export type { EngineAction } from './actions';
