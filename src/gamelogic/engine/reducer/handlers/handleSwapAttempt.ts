// src/gamelogic/engine/reducer/handlers/handleSwapAttempt.ts
import type { EngineState } from '../../../types';

import { canSwap } from '../../../board';
import { pushEvents, rejectSwap } from '../../events';
import { beginSwapAnimating } from '../../swapFlow';
import type { SwapAttemptAction } from '../actions';

export function handleSwapAttempt(state: EngineState, action: SwapAttemptAction): EngineState {
  if (state.phase !== 'idle') return pushEvents(state, [rejectSwap(action.from, action.to, 'locked')]);

  const { from, to } = action;

  const check = canSwap(from, to, state.width, state.cells);
  if (!check.ok) return pushEvents(state, [rejectSwap(from, to, check.reason)]);

  return beginSwapAnimating(state, from, to);
}
