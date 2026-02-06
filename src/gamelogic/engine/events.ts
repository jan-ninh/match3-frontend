import type { AnimDoneIgnoreReason, AnimDoneMode, EngineAnimKind, EngineEvent, EngineState, LevelId, SwapRejectReason } from '../types';

const MAX_EVENTS = 80;

export function pushEvents(state: EngineState, newEvents: EngineEvent[]): EngineState {
  const merged = [...state.events, ...newEvents];
  const capped = merged.length > MAX_EVENTS ? merged.slice(merged.length - MAX_EVENTS) : merged;
  return { ...state, events: capped };
}

export function mkSeededInit(levelId: LevelId, width: number, height: number, seed: number): EngineEvent {
  return { type: 'seededInit', levelId, width, height, seed };
}

export function mkAnimDone(
  mode: AnimDoneMode,
  anim: { kind: EngineAnimKind; enteredAtMs: number; durationMs: number; token: number },
  nowMs: number,
): EngineEvent {
  const dtMs = Math.max(0, nowMs - anim.enteredAtMs);
  const deltaMs = dtMs - anim.durationMs; // negative = early, positive = late
  return { type: 'animDone', mode, kind: anim.kind, token: anim.token, dtMs, deltaMs };
}

export function mkAnimDoneIgnored(kind: EngineAnimKind, token: number, reason: AnimDoneIgnoreReason): EngineEvent {
  return { type: 'animDoneIgnored', kind, token, reason };
}

export function rejectSwap(from: number, to: number, reason: SwapRejectReason): EngineEvent {
  return { type: 'swapRejected', from, to, reason };
}