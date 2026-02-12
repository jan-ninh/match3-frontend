// src/gamelogic/engine/reducer/preAutoFinish.ts
import type { EngineState } from '../../types';

import { autoFinishAll } from '../autoFinish';
import type { ApplyDone } from './applyDone';

export type PreAutoFinishResult = {
  state: EngineState;
  wasAnimating: boolean;
};

export function preAutoFinish(state: EngineState, applyDone: ApplyDone): PreAutoFinishResult {
  const pre = autoFinishAll(state, applyDone);

  // Track if we were in a state that could lead to turn end
  const wasAnimating = pre.phase === 'fallAnimating' || pre.phase === 'swapAnimating';

  return { state: pre, wasAnimating };
}
