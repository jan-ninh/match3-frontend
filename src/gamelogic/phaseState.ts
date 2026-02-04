import type { EngineEvent, EngineState } from './types';
import { isInputLocked, type EnginePhase } from './phases';

export function setPhase(state: EngineState, phase: EnginePhase, events?: EngineEvent[]): EngineState {
  events?.push({ type: 'phase', phase });
  return { ...state, phase, inputLocked: isInputLocked(phase) };
}
