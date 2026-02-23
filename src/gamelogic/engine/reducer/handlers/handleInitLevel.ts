import type { EngineEvent, EngineState } from '../../../types';

import { getLevelDefinition } from '../../../levels';
import { nextAnimToken } from '../../anim';
import { mkHardBoundary } from '../../events';
import { createState } from '../../state';
import { setPhase } from '../../../phaseState';

import { beginAnim } from '../../anim';
import { pushEvents } from '../../events';
import { buildSpawnFallPlan } from '../../fallPlan';
import type { InitLevelAction } from '../actions';

export function handleInitLevel(state: EngineState, _action: InitLevelAction): EngineState {
  const level = getLevelDefinition(_action.levelId);
  const base = nextAnimToken(state.animToken);

  const hardBoundary = mkHardBoundary('initLevel', state.nowMs, base);

  // Hard boundary: carry forward monotonic nowMs (never regress to 0)
  const created = createState(_action.levelId, level.baseSeed, [hardBoundary], base, state.swapMs, state.nowMs);

  // Intro: treat all pieces as spawned during a fall animation (UI spawn hack will animate them even before true-fall UI).
  const events: EngineEvent[] = [];
  const fallPlan = buildSpawnFallPlan(created.pieces, created.seed, created.width);

  let s: EngineState = setPhase(created, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs, { fallPlan });

  return pushEvents(s, events);
}
