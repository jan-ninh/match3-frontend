import type { EngineEvent, EngineState } from '../../../types';
import type { ReshuffleAction } from '../actions';

import { assertBoardIntegrity, assertPhaseInvariants } from '../../../invariants';
import { setPhase } from '../../../phaseState';
import { hasAnyMoves } from '../../../match';
import { shuffleUntilValid, stabilizeBoard } from '../../../cascade';

import { beginAnim } from '../../anim';
import { isStableIdle, pushEvents } from '../../events';

export function handleReshuffle(state: EngineState, action: ReshuffleAction): EngineState {
  // Free action: only from stable idle (prevents overlapping commits / separators)
  if (!isStableIdle(state)) return state;

  const events: EngineEvent[] = [];

  let s: EngineState = state;

  // Clear selection for cleanliness
  if (s.selectedIndex !== null) {
    s = { ...s, selectedIndex: null };
    events.push({ type: 'selectionCleared' });
  }

  // Lock input + shuffle
  s = setPhase(s, 'inputLock', events);
  s = setPhase(s, 'shuffle', events);

  const sh = shuffleUntilValid(s, 200);
  s = sh.state;
  events.push({ type: 'shuffled', attempts: sh.attempts });

  // Guarantee playable: if still deadlocked, stabilize as last resort
  const hasMove = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove });

  if (!hasMove) {
    const stabilized = stabilizeBoard(s, { maxShuffleAttempts: 400 });
    s = stabilized.state;
    events.push(...stabilized.events);

    const hasMove2 = hasAnyMoves(s);
    events.push({ type: 'deadlockCheck', hasMove: hasMove2 });
  }

  // Ack for UI consume (only after accept)
  events.push({ type: 'powerUsed', key: 'extraShuffle', requestId: action.requestId });

  // Enter fall animation phase (engine-owned) to give the player a visual beat
  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  const final = pushEvents(s, events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(final, 'reshuffle');
    assertPhaseInvariants(final, 'reshuffle');
  }

  return final;
}
