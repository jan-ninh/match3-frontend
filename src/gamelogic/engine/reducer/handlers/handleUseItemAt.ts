import type { EngineEvent, EngineState } from '../../../types';
import type { UseItemAtAction } from '../actions';

import { beginAnim } from '../../anim';
import { isStableIdle, mkTurnCommitArmedItem, pushEvents } from '../../events';
import { setPhase } from '../../../phaseState';

import { stabilizeBoard } from '../../../cascade/stabilizeBoard';
import { applyItemEffectAt, getItemEffectPreSteps, getItemEffectPreviewIndices } from '../../../itemeffects';

function powerKeyForItem(key: UseItemAtAction['key']): 'gridlaser' | 'laser' | 'extraShuffle' {
  switch (key) {
    case 'bomb3x3':
      return 'gridlaser';
    case 'laserRow':
      return 'laser';
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function handleUseItemAt(state: EngineState, action: UseItemAtAction): EngineState {
  // Only allow when truly stable idle (idle + no pending commit being consumed).
  if (!isStableIdle(state)) return state;

  const target = action.target;
  const preview = getItemEffectPreviewIndices(action.key, target, state.width, state.height);

  // If nothing would be affected -> ignore (UI should also abort)
  if (preview.length === 0) return state;

  const events: EngineEvent[] = [];

  const isLaser = action.key === 'laserRow';

  // Accept => arm turn commit (engine-owned)
  let s: EngineState = {
    ...state,
    pendingTurnCommit: { kind: 'item', spendMove: false },
    cascadeEffectPolicy: isLaser ? 'noObjectives' : undefined,
  };

  // Observability: instrument every pendingTurnCommit arming
  events.push(mkTurnCommitArmedItem(action.key, target, action.requestId));

  // Also: explicit acceptance event (UI/debug can listen without inferring from side-effects)
  events.push({ type: 'itemAccepted', key: action.key, target, requestId: action.requestId });

  // Clear selection for cleanliness
  if (s.selectedIndex !== null) {
    s = { ...s, selectedIndex: null };
    events.push({ type: 'selectionCleared' });
  }

  // Lock input immediately (phase event must be preserved via same events array)
  s = setPhase(s, 'inputLock', events);

  // Apply effect
  // - Some items are modeled as first-class cascade preSteps (processed BEFORE detect).
  // - If preSteps exist, we apply them via stabilizeBoard with resolve/shuffle disabled (turnEnd pipeline still handles real resolve).
  const preSteps = getItemEffectPreSteps(s, action.key, target);

  if (preSteps !== undefined) {
    // Supported as preSteps. If it would be a no-op, ignore (UI should also abort).
    if (preSteps.length === 0) return state;

    const st = stabilizeBoard(s, { preSteps, maxResolveLoops: 0, maxDeadlockPasses: 0 });
    s = st.state;
    events.push(...st.events);
  } else {
    // Immediate item effect (clear -> gravity -> refill)
    const fx = applyItemEffectAt(s, action.key, target);
    s = fx.state;
    events.push(...fx.events);
  }

  // Ack for UI consume (only after accept)
  events.push({ type: 'powerUsed', key: powerKeyForItem(action.key), requestId: action.requestId });

  // Enter fall animation phase (engine-owned); keep phase event
  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  return pushEvents(s, events);
}
