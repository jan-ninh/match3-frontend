import type { EngineState } from '../../../types';

import { canSwap } from '../../../board';
import { pushEvents, rejectSwap } from '../../events';
import { isStableIdle } from '../../guards';
import { beginSwapAnimating } from '../../swapFlow';
import type { SwapAttemptAction } from '../actions';

export function handleSwapAttempt(state: EngineState, action: SwapAttemptAction): EngineState {
  // Only allow swap attempts when the engine is truly idle (not just `phase === 'idle'`).
  // If a turn-end commit is armed, the reducer must consume it first (single-shot).
  if (!isStableIdle(state)) {
    return pushEvents(state, [rejectSwap(action.from, action.to, 'locked')]);
  }

  const { from, to } = action;

  const check = canSwap(from, to, state.width, state.cells);
  if (!check.ok) return pushEvents(state, [rejectSwap(from, to, check.reason)]);

  // Arming `pendingTurnCommit` is owned by swapFlow (match-confirm), not by the input handler.
  return beginSwapAnimating(state, from, to);
}
