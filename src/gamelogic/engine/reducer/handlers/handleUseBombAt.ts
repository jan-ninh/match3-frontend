import type { EngineEvent, EngineState } from '../../../types';

import { setPhase } from '../../../phaseState';
import { applyBomb3x3, getBomb3x3IndicesFromTarget } from '../../../itemeffects/bomb3x3';

import { beginAnim } from '../../anim';
import { pushEvents } from '../../events';

import type { UseBombAtAction } from '../actions';

export function handleUseBombAt(state: EngineState, action: UseBombAtAction): EngineState {
  if (state.phase !== 'idle') return state;

  const t = action.target;
  if (!t || typeof t.x !== 'number' || typeof t.y !== 'number') return state;

  const x = t.x | 0;
  const y = t.y | 0;

  // allow off-grid center by 1 cell for edge-precision targeting
  if (x < -1 || x > state.width) return state;
  if (y < -1 || y > state.height) return state;

  const preview = getBomb3x3IndicesFromTarget({ x, y }, state.width, state.height);
  if (preview.length === 0) return state;

  const events: EngineEvent[] = [];

  // lock immediately (same pattern as swap pipeline)
  let s = setPhase(state, 'inputLock', events);

  const fx = applyBomb3x3(s, { x, y });
  s = fx.state;
  events.push(...fx.events);

  // run the same fall animation pipeline (fallAnimDone will stabilize/resolve)
  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  return pushEvents(s, events);
}
