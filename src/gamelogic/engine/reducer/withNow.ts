// src/gamelogic/engine/reducer/withNow.ts
import type { EngineState } from '../../types';

export function withNow(state: EngineState, action: { nowMs?: number }): EngineState {
  const t = action.nowMs;
  if (typeof t !== 'number' || !Number.isFinite(t)) return state;

  const nowMs = Math.max(state.nowMs, t);
  return state.nowMs === nowMs ? state : { ...state, nowMs };
}
