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
import { handleUseItemAt } from './handlers/handleUseBombAt';

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

      case 'useItemAt': {
        return handleUseItemAt(s, action);
      }

      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
      }
    }
  })();

  let final = next;

  // Turn-end is engine-owned: apply only when idle AND a commit exists.
  if (final.phase === 'idle' && final.pendingTurnCommit !== null) {
    const commit = final.pendingTurnCommit;
    final = applyTurnEndPipeline(final, commit);

    // Single-shot: always consume (also if pipeline decides "no turn-end" for swap spendMove=false)
    final = { ...final, pendingTurnCommit: null };
  }

  // Resolve win/lose only when idle (win has precedence over lose)
  final = resolveOutcomeIfIdle(final);

  if (import.meta.env.DEV) assertPhaseInvariants(final, `engineReducer:${action.type}`);

  return final;
}

export type { EngineAction } from './actions';
