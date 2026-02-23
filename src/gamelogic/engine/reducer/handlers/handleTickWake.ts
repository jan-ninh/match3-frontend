import type { EngineEvent, EngineState } from '../../../types';
import type { EnemyTurnAction, TickAction, WakeAction } from '../actions';

import { beginAnim } from '../../anim';
import { setPhase } from '../../../phaseState';
import { isStableIdle, pushEvents } from '../../events';

import { stabilizeBoard } from '../../../cascade/stabilizeBoard';
import { applyItemEffectAt, getItemEffectPreSteps, getItemEffectPreviewIndices } from '../../../itemeffects';

import { handleEnemyTurn } from './handleEnemyTurn';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function execPendingLaserRow(state: EngineState): EngineState {
  const pending = state.pendingLaserRow;
  if (!pending) return state;

  const nowMs = state.nowMs | 0;
  const executeAtMs = pending.executeAtMs | 0;
  if (executeAtMs <= 0) return { ...state, pendingLaserRow: null };

  if (nowMs < executeAtMs) return state;
  if (state.phase === 'win' || state.phase === 'lose') return { ...state, pendingLaserRow: null };

  const target = pending.target;
  const preview = getItemEffectPreviewIndices('laserRow', target, state.width, state.height);

  // Defensive: if this becomes a no-op, clear pending and unlock via normal pipeline.
  if (preview.length === 0) {
    const evs: EngineEvent[] = [];
    const cleared = { ...state, pendingLaserRow: null };
    const next = setPhase(cleared, 'idle', evs);
    return pushEvents(next, evs);
  }

  const events: EngineEvent[] = [];

  let s: EngineState = { ...state, pendingLaserRow: null };

  const preSteps = getItemEffectPreSteps(s, 'laserRow', target);
  if (preSteps !== undefined) {
    if (preSteps.length === 0) {
      // Should not happen if preview was non-empty, but keep engine safe.
      const next = setPhase(s, 'idle', events);
      return pushEvents(next, events);
    }

    const st = stabilizeBoard(s, { preSteps, maxResolveLoops: 0, maxDeadlockPasses: 0 });
    s = st.state;
    events.push(...st.events);
  } else {
    const fx = applyItemEffectAt(s, 'laserRow', target);
    s = fx.state;
    events.push(...fx.events);
  }

  // Ack for UI consume (only when the effect actually happens)
  events.push({ type: 'powerUsed', key: 'laser', requestId: pending.requestId });

  s = setPhase(s, 'fallAnimating', events);
  s = beginAnim(s, 'fall', s.swapMs);

  return pushEvents(s, events);
}

export function handleTickWake(state: EngineState, action: TickAction | WakeAction): EngineState {
  const t = action.nowMs;
  const nowMs = typeof t === 'number' && Number.isFinite(t) ? Math.max(state.nowMs, t) : state.nowMs;

  let s: EngineState = state.nowMs === nowMs ? state : { ...state, nowMs };

  // 0) Execute pending delayed items first (engine-owned timing)
  if (s.pendingLaserRow) {
    s = execPendingLaserRow(s);
  }

  if (s.phase === 'win' || s.phase === 'lose') return s;

  // Level 09 timer (engine-owned)
  const startSec = s.level9TimerStartSec | 0;
  if (startSec > 0) {
    // Init deadline lazily: createInitialState starts at nowMs=0.
    if ((s.level9TimerDeadlineAtMs | 0) <= 0 && nowMs > 0) {
      s = { ...s, level9TimerStage: 0, level9TimerDeadlineAtMs: nowMs + clampInt(startSec, 0, 60 * 60) * 1000 };
    }

    const deadline = s.level9TimerDeadlineAtMs | 0;
    if (deadline > 0 && nowMs >= deadline) {
      const evs: EngineEvent[] = [];
      const next = setPhase(s, 'lose', evs);
      evs.push({ type: 'lose' });
      return pushEvents(next, evs);
    }
  }

  // Enemy turn scheduler (engine-owned)
  const enemyEnabled = s.enemyTurnEnabled === true && (s.enemyTurnEveryMs | 0) > 0;

  if (enemyEnabled && (s.nextEnemyTurnAtMs | 0) <= 0 && nowMs > 0) {
    // Initialize deterministically once we have a real clock.
    const every = clampInt(s.enemyTurnEveryMs, 250, 60 * 1000);
    s = { ...s, enemyTurnEveryMs: every, nextEnemyTurnAtMs: nowMs + every };
  }

  const nextAt = s.nextEnemyTurnAtMs | 0;
  if (enemyEnabled && nextAt > 0 && nowMs >= nextAt && isStableIdle(s)) {
    const enemyAction: EnemyTurnAction = { type: 'enemyTurn', nowMs };
    const acted = handleEnemyTurn(s, enemyAction);

    // No catch-up loops: at most one enemy move per tick/wake.
    const every = clampInt(s.enemyTurnEveryMs, 250, 60 * 1000);
    return { ...acted, enemyTurnEveryMs: every, nextEnemyTurnAtMs: nowMs + every };
  }

  return s;
}
