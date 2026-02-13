// src/gamelogic/engine/reducer/handlers/handleSetSwapMs.ts
import type { EngineState } from '../../../types';

import { sanitizeSwapMs } from '../../anim';
import { autoFinishAll } from '../../autoFinish';
import type { ApplyDone } from '../applyDone';
import type { SetSwapMsAction } from '../actions';

export function handleSetSwapMs(state: EngineState, action: SetSwapMsAction, applyDone: ApplyDone): EngineState {
  const nextSwapMs = sanitizeSwapMs(action.swapMs);
  if (state.swapMs === nextSwapMs) return state;

  let nextState: EngineState = { ...state, swapMs: nextSwapMs };

  // reduced motion toggle while animating => force immediate finish (no drift window)
  if (nextSwapMs === 0 && nextState.anim) {
    const a = nextState.anim;
    nextState = { ...nextState, anim: { ...a, durationMs: 0, deadlineAtMs: a.enteredAtMs } };
    return autoFinishAll(nextState, applyDone);
  }

  return nextState;
}
