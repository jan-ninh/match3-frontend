import type { AnimDoneMode, EngineAnimKind, EngineState } from '../types';

export type ApplyAnimDone = (state: EngineState, kind: EngineAnimKind, token: number, mode: AnimDoneMode) => EngineState;

export function tryAutoFinishAnim(state: EngineState, applyDone: ApplyAnimDone): EngineState {
  const a = state.anim;
  if (!a) return state;

  if (state.nowMs < a.deadlineAtMs) return state;

  return applyDone(state, a.kind, a.token, 'auto');
}

export function autoFinishAll(state: EngineState, applyDone: ApplyAnimDone): EngineState {
  // bounded loop to avoid infinite locks if a bug slips in
  let s = state;
  for (let i = 0; i < 128; i++) {
    const next = tryAutoFinishAnim(s, applyDone);
    if (next === s) break;
    s = next;
  }
  return s;
}