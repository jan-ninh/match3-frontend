// src\gamelogic\engine\fallFlow.ts
import type { AnimDoneIgnoreReason, AnimDoneMode, EngineEvent, EngineState } from '../types';
import { hasAnyMoves } from '../match';
import { resolveOnce, shuffleUntilValid, stabilizeBoard } from '../cascade';
import { assertBoardIntegrity, assertPhaseInvariants } from '../invariants';
import { setPhase } from '../phaseState';

import { beginAnim } from './anim';
import { autoFinishAll } from './autoFinish';
import type { ApplyAnimDone } from './autoFinish';
import { mkAnimDone, mkAnimDoneIgnored, pushEvents } from './events';

// Turn-end is engine-owned and runs centrally in engineReducer when we reach `idle` and `pendingTurnCommit` exists.
// fallFlow must NOT execute any turn-end logic, otherwise it can double-fire.

const applyDone: ApplyAnimDone = (st, kind, tok, mode) => {
  if (kind !== 'fall') return st;
  return applyFallAnimDone(st, tok, mode);
};

export function applyFallAnimDone(state: EngineState, token: number, mode: AnimDoneMode): EngineState {
  const ignore = (reason: AnimDoneIgnoreReason): EngineState => {
    if (mode !== 'early') return state;
    if (!import.meta.env.DEV) return state;
    return pushEvents(state, [mkAnimDoneIgnored('fall', token, reason)]);
  };

  if (state.phase !== 'fallAnimating') return ignore('wrongPhase');

  const a = state.anim;
  if (!a) return ignore('missingAnim');
  if (a.kind !== 'fall') return ignore('wrongKind');
  if (a.token !== token) return ignore('wrongToken');

  const doneEvent = mkAnimDone(mode, a, state.nowMs);

  const events: EngineEvent[] = [doneEvent];

  let s: EngineState = { ...state, anim: null };

  // continue resolve chain (if any)
  s = setPhase(s, 'inputLock', events);

  const step = resolveOnce(s);
  s = step.state;
  events.push(...step.events);

  if (step.didResolve) {
    s = setPhase(s, 'fallAnimating', events);
    s = beginAnim(s, 'fall', s.swapMs);

    const withEvents = pushEvents(s, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'fall+resolveOnce');
      assertPhaseInvariants(withEvents, 'fall+resolveOnce');
    }

    if (withEvents.anim?.durationMs === 0) {
      return autoFinishAll(withEvents, applyDone);
    }

    return withEvents;
  }

  // no matches => deadlock check
  s = setPhase(s, 'deadlockCheck', events);
  const hasMove = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove });

  if (hasMove) {
    // IMPORTANT: do NOT run turn-end here. We just reach idle; engineReducer will run turn-end via pendingTurnCommit.
    s = setPhase(s, 'idle', events);
    const withEvents = pushEvents(s, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'fall->idle');
      assertPhaseInvariants(withEvents, 'fall->idle');
    }

    return withEvents;
  }

  // deadlock => shuffle (instant)
  s = setPhase(s, 'shuffle', events);
  const sh = shuffleUntilValid(s, 200);
  s = sh.state;
  events.push({ type: 'shuffled', attempts: sh.attempts });

  // if shuffle produced matches, resolve once and animate
  const post = resolveOnce(s);
  s = post.state;
  events.push(...post.events);

  if (post.didResolve) {
    s = setPhase(s, 'fallAnimating', events);
    s = beginAnim(s, 'fall', s.swapMs);

    const withEvents = pushEvents(s, events);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(withEvents, 'shuffle->resolveOnce+fall');
      assertPhaseInvariants(withEvents, 'shuffle->resolveOnce+fall');
    }

    if (withEvents.anim?.durationMs === 0) {
      return autoFinishAll(withEvents, applyDone);
    }

    return withEvents;
  }

  // SECOND deadlock check after post-resolve (guarantee playable)
  s = setPhase(s, 'deadlockCheck', events);
  const hasMove2 = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove: hasMove2 });

  if (!hasMove2) {
    // last resort: full stabilize
    const stabilized = stabilizeBoard(s, { maxShuffleAttempts: 400 });
    const allEvents = [...events, ...stabilized.events];
    const merged = pushEvents(stabilized.state, allEvents);

    if (import.meta.env.DEV) {
      assertBoardIntegrity(merged, 'shuffle->stabilize');
      assertPhaseInvariants(merged, 'shuffle->stabilize');
    }

    return merged;
  }

  // IMPORTANT: do NOT run turn-end here. We just reach idle; engineReducer will run turn-end via pendingTurnCommit.
  s = setPhase(s, 'idle', events);
  const final = pushEvents(s, events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(final, 'fall->shuffle->idle');
    assertPhaseInvariants(final, 'fall->shuffle->idle');
  }

  return final;
}
