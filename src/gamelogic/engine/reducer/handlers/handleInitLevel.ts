// src/gamelogic/engine/reducer/handlers/handleInitLevel.ts
import type { EngineState } from '../../../types';

import { getLevelDefinition } from '../../../levels';
import { nextAnimToken } from '../../anim';
import { createState } from '../../state';
import type { InitLevelAction } from '../actions';

export function handleInitLevel(state: EngineState, _action: InitLevelAction): EngineState {
  const level = getLevelDefinition(_action.levelId);
  const base = nextAnimToken(state.animToken);

  // Hard boundary: carry forward monotonic nowMs (never regress to 0)
  return createState(_action.levelId, level.baseSeed, [], base, state.swapMs, state.nowMs);
}
