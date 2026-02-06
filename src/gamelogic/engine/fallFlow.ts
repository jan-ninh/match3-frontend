import type { AnimDoneIgnoreReason, AnimDoneMode, EngineState } from '../types';
import { hasAnyMoves } from '../match';
import { resolveOnce, shuffleUntilValid, stabilizeBoard } from '../cascade';
import { assertBoardIntegrity, assertPhaseInvariants } from '../invariants';
import { setPhase } from '../phaseState';

import { beginAnim } from './anim';
import { autoFinishAll } from './autoFinish';
import { mkAnimDone, mkAnimDoneIgnored, pushEvents } from './events';

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

  const events = [doneEvent];

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
      const applyDone = (st: EngineState, kind: any, tok: number, m: AnimDoneMode) =>
        kind === 'fall' ? applyFallAnimDone(st, tok, m) : st;
      return autoFinishAll(withEvents, applyDone);
    }

    return withEvents;
  }

  // no matches => deadlock check
  s = setPhase(s, 'deadlockCheck', events);
  const hasMove = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove });

  if (hasMove) {
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
      const applyDone = (st: EngineState, kind: any, tok: number, m: AnimDoneMode) =>
        kind === 'fall' ? applyFallAnimDone(st, tok, m) : st;
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

  s = setPhase(s, 'idle', events);
  const final = pushEvents(s, events);

  if (import.meta.env.DEV) {
    assertBoardIntegrity(final, 'fall->shuffle->idle');
    assertPhaseInvariants(final, 'fall->shuffle->idle');
  }

  return final;
}