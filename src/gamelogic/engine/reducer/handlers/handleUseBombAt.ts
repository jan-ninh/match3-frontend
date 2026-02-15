// src/gamelogic/engine/reducer/handlers/handleUseBombAt.ts
import type { EngineEvent, EngineState } from '../../../types';
import type { UseItemAtAction } from '../actions';

import { beginAnim } from '../../anim';
import { setPhase } from '../../../phaseState';

import { applyItemEffectAt, getItemEffectPreviewIndices } from '../../../itemeffects';

function powerKeyForItem(key: UseItemAtAction['key']): 'bomb' | 'rocket' | 'extraTime' {
  switch (key) {
    case 'bomb3x3':
      return 'bomb';
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function handleUseItemAt(state: EngineState, action: UseItemAtAction): EngineState {
  // Only allow when idle and not locked
  if (state.phase !== 'idle') return state;
  if (state.inputLocked) return state;

  const target = action.target;
  const preview = getItemEffectPreviewIndices(action.key, target, state.width, state.height);

  // If nothing would be affected -> ignore (UI should also abort)
  if (preview.length === 0) return state;

  const events: EngineEvent[] = [];

  // Clear selection for cleanliness
  let s: EngineState = state;
  if (s.selectedIndex !== null) {
    s = { ...s, selectedIndex: null };
    events.push({ type: 'selectionCleared' });
  }

  // Lock input immediately
  s = setPhase(s, 'inputLock', events);

  // Apply effect (clear -> gravity -> refill), then animate as fall
  const fx = applyItemEffectAt(s, action.key, target);

  // Ack for UI consume (only after accept)
  fx.events.push({ type: 'powerUsed', key: powerKeyForItem(action.key), requestId: action.requestId });

  let next = pushAllEvents(fx.state, [...events, ...fx.events]);

  // Enter fall animation phase (engine-owned)
  next = setPhase(next, 'fallAnimating', []);
  next = beginAnim(next, 'fall', next.swapMs);

  return next;
}

// local helper to avoid importing pushEvents (keeps handler simple & explicit)
function pushAllEvents(state: EngineState, evs: EngineEvent[]): EngineState {
  if (evs.length === 0) return state;
  return { ...state, events: [...state.events, ...evs] };
}
