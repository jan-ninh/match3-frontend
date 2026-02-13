// src/gamelogic/engine/reducer/handlers/handleTickWake.ts
import type { EngineState } from '../../../types';
import type { TickAction, WakeAction } from '../actions';

export function handleTickWake(state: EngineState, _action: TickAction | WakeAction): EngineState {
  return state;
}
