import type { EngineEvent, EngineState } from '../../../types';

import { nextAnimToken } from '../../anim';
import { mkHardBoundary } from '../../events';
import { createState } from '../../state';
import { setPhase } from '../../../phaseState';

import { beginAnim } from '../../anim';
import { pushEvents } from '../../events';
import { buildSpawnFallPlan } from '../../fallPlan';
import { computeFallAnimWaitMs } from '../../fallingTuning';
import type { ResetBoardAction } from '../actions';

export function handleResetBoard(state: EngineState, _action: ResetBoardAction): EngineState {
  // Hard boundary: works from ANY phase (including mid-animation).
  // All in-flight ephemerals (anim, pendingSwap, pendingTurnCommit) are
  // neutralized by createState producing entirely fresh state.
  // Stale *AnimDone tokens are invalidated by nextAnimToken bump.

  const newSeed = ((state.seed >>> 0) + 1) >>> 0;
  const resetEvent: EngineEvent = { type: 'reset', levelId: state.levelId, seed: newSeed };
  const base = nextAnimToken(state.animToken);

  const hardBoundary = mkHardBoundary('resetBoard', state.nowMs, base);

  // Carry forward monotonic nowMs (never regress to 0)
  const created = createState(state.levelId, newSeed, [hardBoundary, resetEvent], base, state.swapMs, state.nowMs);

  // Intro: treat all pieces as spawned during a fall animation (UI spawn hack will animate them even before true-fall UI).
  const events: EngineEvent[] = [];
  const fallPlan = buildSpawnFallPlan(created.pieces, created.seed, created.width);

  let s: EngineState = setPhase(created, 'fallAnimating', events);

  const fallWaitMs = computeFallAnimWaitMs(s.swapMs, s.width, fallPlan);
  s = beginAnim(s, 'fall', fallWaitMs, { fallPlan });

  return pushEvents(s, events);
}
