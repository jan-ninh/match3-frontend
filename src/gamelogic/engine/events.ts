import type {
  AnimDoneIgnoreReason,
  AnimDoneMode,
  EngineAnimKind,
  EngineEvent,
  EngineState,
  HardBoundaryKind,
  ItemEffectKeyForEvent,
  LevelId,
  SwapRejectReason,
} from '../types';

const MAX_EVENTS = 80;

// ─────────────────────────────────────────────
// Stable-Idle SSOT (used for turnSeparator emission)
// ─────────────────────────────────────────────

export function isStableIdle(state: Pick<EngineState, 'phase' | 'inputLocked' | 'anim' | 'pendingSwap' | 'pendingTurnCommit'>): boolean {
  return (
    state.phase === 'idle' &&
    state.inputLocked === false &&
    state.anim === null &&
    state.pendingSwap === null &&
    state.pendingTurnCommit === null
  );
}

// ─────────────────────────────────────────────
// Core event helpers
// ─────────────────────────────────────────────

export function pushEvents(state: EngineState, newEvents: EngineEvent[]): EngineState {
  const merged = [...state.events, ...newEvents];
  const capped = merged.length > MAX_EVENTS ? merged.slice(merged.length - MAX_EVENTS) : merged;
  return { ...state, events: capped };
}

export function mkSeededInit(levelId: LevelId, width: number, height: number, seed: number): EngineEvent {
  return { type: 'seededInit', levelId, width, height, seed };
}

export function mkHardBoundary(kind: HardBoundaryKind, nowMs: number, animTokenBase: number): EngineEvent {
  return { type: 'hardBoundary', kind, nowMs, animTokenBase };
}

export function mkAnimBegin(
  kind: EngineAnimKind,
  token: number,
  durationMs: number,
  enteredAtMs: number,
  deadlineAtMs: number,
): EngineEvent {
  return { type: 'animBegin', kind, token, durationMs, enteredAtMs, deadlineAtMs };
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

// ─────────────────────────────────────────────
// Pre-Falling Guardrails: Observability event constructors
// ─────────────────────────────────────────────

export function mkTurnCommitArmedSwap(spendMove: boolean, from: number, to: number): EngineEvent {
  return { type: 'turnCommitArmed', kind: 'swap', spendMove, from, to };
}

export function mkTurnCommitArmedItem(key: ItemEffectKeyForEvent, target: { x: number; y: number }, requestId: number): EngineEvent {
  return { type: 'turnCommitArmed', kind: 'item', key, target, requestId };
}

export function mkTurnEndStart(kind: 'swap' | 'item', spendMove: boolean): EngineEvent {
  return { type: 'turnEndStart', kind, spendMove };
}

export function mkTurnEndComplete(): EngineEvent {
  return { type: 'turnEndComplete' };
}

export function mkTurnSeparator(): EngineEvent {
  return { type: 'turnSeparator' };
}
