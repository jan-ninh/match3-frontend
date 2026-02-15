// src/gamelogic/engine/reducer/handlers/handleUseItemAt.ts
import type { EngineEvent, EngineState } from '../../../types';
import type { UseItemAtAction } from '../actions';

import { beginAnim } from '../../anim';
import { mkTurnCommitArmedItem, pushEvents } from '../../events';
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

  // Accept => arm turn commit (engine-owned)
  let s: EngineState = {
    ...state,
    pendingTurnCommit: { kind: 'item', spendMove: false },
  };

  // Observability: instrument every pendingTurnCommit arming
  events.push(mkTurnCommitArmedItem(action.key, target, action.requestId));

  // Clear selection for cleanliness
  if (s.selectedIndex !== null) {
    s = { ...s, selectedIndex: null };
    events.push({ type: 'selectionCleared' });
  }

  // Lock input immediately (phase event must be preserved via same events array)
  s = setPhase(s, 'inputLock', events);

  // Apply effect (clear -> gravity -> refill); keep central event policy (pushEvents only once at the end)
  const fx = applyItemEffectAt(s, action.key, target);
  s = fx.state;
  events.push(...fx.events);

  // Ack for UI consume (only after accept)
  events.push({ type: 'powerUsed', key: powerKeyForItem(action.key), requestId: action.requestId });

  // Enter fall animation phase (engine-owned); keep phase event
  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  return pushEvents(s, events);
}
