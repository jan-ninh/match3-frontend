// src/gamelogic/cascade/resolveOnce.ts
import type { EngineEvent, EngineState } from '../types';
import type { ResolveOnceResult } from './types-cascade';

import { detect } from './detect';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

export function resolveOnce(state: EngineState, chargedIds: Set<number> = new Set()): ResolveOnceResult {
  let s = state;
  const events: EngineEvent[] = [];

  const effects = getCascadeEffectsForState(s);
  let ctx = { chargedIds };

  events.push({ type: 'phase', phase: 'detect' });
  const m = detect(s);

  if (m.clearIndices.length === 0) {
    return { state: s, events, didResolve: false, chargedIds: ctx.chargedIds };
  }

  events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

  // pre-clear effects (level mechanics)
  const pre = runPreClearEffects(effects, s, m, ctx, events);
  s = pre.state;
  ctx = pre.ctx;

  events.push({ type: 'phase', phase: 'clear' });
  s = clearCellsAndPieces(s, m.clearIndices);
  events.push({ type: 'cleared', count: m.clearIndices.length });

  const postClear = runPostClearEffects(effects, s, ctx, events);
  s = postClear.state;
  ctx = postClear.ctx;

  events.push({ type: 'phase', phase: 'gravity' });
  s = applyGravity(s);
  events.push({ type: 'gravity' });

  const postGravity = runPostGravityEffects(effects, s, ctx, events);
  s = postGravity.state;
  ctx = postGravity.ctx;

  events.push({ type: 'phase', phase: 'refill' });
  const ref = applyRefill(s);
  s = ref.state;
  events.push({ type: 'refilled', count: ref.spawned });

  const postRefill = runPostRefillEffects(effects, s, ctx, events);
  s = postRefill.state;
  ctx = postRefill.ctx;

  events.push({ type: 'phase', phase: 'settle' });

  return { state: s, events, didResolve: true, chargedIds: ctx.chargedIds };
}
