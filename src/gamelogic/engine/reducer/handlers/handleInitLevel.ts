import type { EngineState } from '../../../types';

import { getLevelDefinition } from '../../../levels';
import { nextAnimToken } from '../../anim';
import { mkHardBoundary } from '../../events';
import { createState } from '../../state';
import type { InitLevelAction } from '../actions';

export function handleInitLevel(state: EngineState, _action: InitLevelAction): EngineState {
  const level = getLevelDefinition(_action.levelId);
  const base = nextAnimToken(state.animToken);

  const hardBoundary = mkHardBoundary('initLevel', state.nowMs, base);

  // Hard boundary: carry forward monotonic nowMs (never regress to 0)
  return createState(_action.levelId, level.baseSeed, [hardBoundary], base, state.swapMs, state.nowMs);
}
