import type { EngineAnimKind, EngineState } from '../types';
import { ANIM_EPSILON_MS, SWAP_MS } from '../animTimings';

export function nextAnimToken(base: number): number {
  return ((base >>> 0) + 1) >>> 0;
}

export function sanitizeSwapMs(v: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return SWAP_MS;
  return Math.max(0, Math.round(v));
}

export function beginAnim(state: EngineState, kind: EngineAnimKind, durationMs: number): EngineState {
  const token = nextAnimToken(state.animToken);
  const enteredAtMs = state.nowMs;
  const epsilon = durationMs > 0 ? ANIM_EPSILON_MS : 0;
  const deadlineAtMs = enteredAtMs + durationMs + epsilon;

  return {
    ...state,
    animToken: token,
    anim: { kind, enteredAtMs, durationMs, deadlineAtMs, token },
  };
}