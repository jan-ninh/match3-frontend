// src/gamelogic/engine/reducer/handlers/handleInitLevel.ts
import type { EngineState } from '../../../types';

import { getLevelDefinition } from '../../../levels';
import { nextAnimToken } from '../../anim';
import { createState } from '../../state';
import type { InitLevelAction } from '../actions';

export function handleInitLevel(state: EngineState, action: InitLevelAction): EngineState {
  const level = getLevelDefinition(action.levelId);
  const base = nextAnimToken(state.animToken);
  return createState(action.levelId, level.baseSeed, [], base, state.swapMs);
}
