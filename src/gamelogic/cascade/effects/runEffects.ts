// src/gamelogic/cascade/effects/runEffects.ts
import type { EngineEvent, EngineState } from '../../types';
import type { MatchDetection } from '../../match';
import type { CascadeContext } from '../types-cascade';
import type { CascadeEffect, StageResult } from './effectTypes';

function runStage(
  effects: readonly CascadeEffect[],
  stage: 'postClear' | 'postGravity' | 'postRefill',
  state: EngineState,
  ctx: CascadeContext,
  events: EngineEvent[],
): StageResult {
  let s = state;
  let c = ctx;

  for (const e of effects) {
    const fn = e[stage];
    if (!fn) continue;

    const res = fn({ state: s, ctx: c, events });
    s = res.state;
    c = res.ctx;
  }

  return { state: s, ctx: c };
}

export function runPreClearEffects(
  effects: readonly CascadeEffect[],
  state: EngineState,
  match: MatchDetection,
  ctx: CascadeContext,
  events: EngineEvent[],
): StageResult {
  let s = state;
  let c = ctx;

  for (const e of effects) {
    if (!e.preClear) continue;
    const res = e.preClear({ state: s, match, ctx: c, events });
    s = res.state;
    c = res.ctx;
  }

  return { state: s, ctx: c };
}

export function runPostClearEffects(effects: readonly CascadeEffect[], state: EngineState, ctx: CascadeContext, events: EngineEvent[]): StageResult {
  return runStage(effects, 'postClear', state, ctx, events);
}

export function runPostGravityEffects(effects: readonly CascadeEffect[], state: EngineState, ctx: CascadeContext, events: EngineEvent[]): StageResult {
  return runStage(effects, 'postGravity', state, ctx, events);
}

export function runPostRefillEffects(effects: readonly CascadeEffect[], state: EngineState, ctx: CascadeContext, events: EngineEvent[]): StageResult {
  return runStage(effects, 'postRefill', state, ctx, events);
}
