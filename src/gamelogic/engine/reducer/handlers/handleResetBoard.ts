// src/gamelogic/engine/reducer/handlers/handleResetBoard.ts
import type { EngineEvent, EngineState } from '../../../types';

import { nextAnimToken } from '../../anim';
import { createState } from '../../state';
import type { ResetBoardAction } from '../actions';

export function handleResetBoard(state: EngineState, _action: ResetBoardAction): EngineState {
  if (state.phase !== 'idle') return state;

  const newSeed = ((state.seed >>> 0) + 1) >>> 0;
  const resetEvent: EngineEvent = { type: 'reset', levelId: state.levelId, seed: newSeed };
  const base = nextAnimToken(state.animToken);

  return createState(state.levelId, newSeed, [resetEvent], base, state.swapMs);
}
