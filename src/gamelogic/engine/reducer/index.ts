import type { EngineState } from '../../types';
import { assertPhaseInvariants } from '../../invariants';

import type { EngineAction } from './actions';
import { applyDone } from './applyDone';
import { preAutoFinish } from './preAutoFinish';
import { withNow } from './withNow';

import { handleAnimDone } from './handlers/handleAnimDone';
import { handleClickCell } from './handlers/handleClickCell';
import { handleInitLevel } from './handlers/handleInitLevel';
import { handleResetBoard } from './handlers/handleResetBoard';
import { handleSetSwapMs } from './handlers/handleSetSwapMs';
import { handleSwapAttempt } from './handlers/handleSwapAttempt';
import { handleTickWake } from './handlers/handleTickWake';
import { handleUseBombAt } from './handlers/handleUseBombAt';

import { applyTurnEndPipeline } from './post/applyTurnEndPipeline';
import { resolveOutcomeIfIdle } from './post/resolveOutcome';

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  const sNow = withNow(state, action);

  // Auto-finish first: if deadline passed, unlock phase before processing the incoming action.
  const pre = preAutoFinish(sNow, applyDone);

  const next = (() => {
    const s = pre.state;

    switch (action.type) {
      case 'tick':
      case 'wake': {
        return handleTickWake(s, action);
      }

      case 'setSwapMs': {
        return handleSetSwapMs(s, action, applyDone);
      }

      case 'initLevel': {
        return handleInitLevel(s, action);
      }

      case 'resetBoard': {
        return handleResetBoard(s, action);
      }

      case 'swapAttempt': {
        return handleSwapAttempt(s, action);
      }

      case 'swapAnimDone':
      case 'swapBackAnimDone':
      case 'fallAnimDone': {
        return handleAnimDone(s, action);
      }

      case 'clickCell': {
        return handleClickCell(s, action);
      }

      case 'useBombAt': {
        return handleUseBombAt(s, action);
      }

      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
      }
    }
  })();

  let final = next;

  // Apply turn end effects if we just transitioned to idle after animations
  const justReachedIdle = final.phase === 'idle' && pre.wasAnimating;
  if (justReachedIdle) {
    // Check if this was a successful swap (moves were spent)
    const movesWereSpent = final.movesLeft < state.movesLeft;
    final = applyTurnEndPipeline(final, movesWereSpent);
  }

  // Resolve win/lose only when idle (win has precedence over lose)
  final = resolveOutcomeIfIdle(final);

  if (import.meta.env.DEV) assertPhaseInvariants(final, `engineReducer:${action.type}`);

  return final;
}

export type { EngineAction } from './actions';
