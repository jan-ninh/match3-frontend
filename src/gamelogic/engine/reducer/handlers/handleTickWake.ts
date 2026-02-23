import type { EngineEvent, EngineState } from '../../../types';
import type { TickAction, WakeAction } from '../actions';

import { setPhase } from '../../../phaseState';
import { pushEvents } from '../../events';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

export function handleTickWake(state: EngineState, action: TickAction | WakeAction): EngineState {
  const t = action.nowMs;
  const nowMs = typeof t === 'number' && Number.isFinite(t) ? Math.max(state.nowMs, t) : state.nowMs;

  let s: EngineState = state.nowMs === nowMs ? state : { ...state, nowMs };

  const startSec = s.level9TimerStartSec | 0;
  if (startSec <= 0) return s;

  // Init deadline lazily: createInitialState starts at nowMs=0.
  if ((s.level9TimerDeadlineAtMs | 0) <= 0 && nowMs > 0) {
    s = { ...s, level9TimerStage: 0, level9TimerDeadlineAtMs: nowMs + clampInt(startSec, 0, 60 * 60) * 1000 };
  }

  const deadline = s.level9TimerDeadlineAtMs | 0;
  if (deadline > 0 && nowMs >= deadline && s.phase !== 'win' && s.phase !== 'lose') {
    const evs: EngineEvent[] = [];
    const next = setPhase(s, 'lose', evs);
    evs.push({ type: 'lose' });
    return pushEvents(next, evs);
  }

  return s;
}
