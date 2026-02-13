import type { EngineEvent, EngineState } from '../../../types';

import { setPhase } from '../../../phaseState';
import { applyBomb3x3 } from '../../../itemeffects/bomb3x3';

import { beginAnim } from '../../anim';
import { pushEvents } from '../../events';

import type { UseBombAtAction } from '../actions';

export function handleUseBombAt(state: EngineState, action: UseBombAtAction): EngineState {
  if (state.phase !== 'idle') return state;

  const index = action.index | 0;
  const size = state.width * state.height;
  if (index < 0 || index >= size) return state;

  const events: EngineEvent[] = [];

  // lock immediately (same pattern as swap pipeline)
  let s = setPhase(state, 'inputLock', events);

  const fx = applyBomb3x3(s, index);
  s = fx.state;
  events.push(...fx.events);

  // run the same fall animation pipeline (fallAnimDone will stabilize/resolve)
  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  return pushEvents(s, events);
}
