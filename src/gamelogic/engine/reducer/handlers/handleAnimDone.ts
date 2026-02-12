// src/gamelogic/engine/reducer/handlers/handleAnimDone.ts
import type { EngineState } from '../../../types';

import { applyFallAnimDone } from '../../fallFlow';
import { applySwapAnimDone, applySwapBackAnimDone } from '../../swapFlow';
import type { FallAnimDoneAction, SwapAnimDoneAction, SwapBackAnimDoneAction } from '../actions';

export function handleAnimDone(state: EngineState, action: SwapAnimDoneAction | SwapBackAnimDoneAction | FallAnimDoneAction): EngineState {
  switch (action.type) {
    case 'swapAnimDone': {
      return applySwapAnimDone(state, action.token, 'early');
    }
    case 'swapBackAnimDone': {
      return applySwapBackAnimDone(state, action.token, 'early');
    }
    case 'fallAnimDone': {
      return applyFallAnimDone(state, action.token, 'early');
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled anim-done action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
