// src/gamelogic/cascade/deadlockCheck.ts
import type { EngineEvent, EngineState } from '../types';
import { hasAnyMoves } from '../match';

export function deadlockCheck(state: EngineState, events: EngineEvent[]): boolean {
  const hasMove = hasAnyMoves(state);
  events.push({ type: 'deadlockCheck', hasMove });
  return hasMove;
}
