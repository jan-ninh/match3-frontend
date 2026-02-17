import type { EngineEvent, EngineState } from '../types';
import type { ResolveOnceOpts, ResolveOnceResult } from './typesCascade';

import { detect } from './detect';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

type MatchDetectionLike = { clearIndices: number[]; groups: number };

function countClearablePieces(state: EngineState, indices: number[]): number {
  let count = 0;

  for (const idx of indices) {
    const c = state.cells[idx];
    if (!c || c.blocked) continue;

    // Obstacles are cleared by their own mechanics
    // chargedCell is passable and can hold pieces -> must be cleared normally.
    if (c.obstacle && c.obstacle.kind !== 'chargedCell') continue;

    if (c.pieceId !== null) count++;
  }

  return count;
}

export function resolveOnce(state: EngineState, chargedIds: Set<number> = new Set(), opts?: ResolveOnceOpts): ResolveOnceResult {
  let s = state;
  const events: EngineEvent[] = [];

  const effects = getCascadeEffectsForState(s);
  let ctx = { chargedIds };

  let didSomething = false;

  // ─────────────────────────────────────────────
  // First-class preSteps (e.g. item clears) BEFORE detect
  // ─────────────────────────────────────────────
  const preSteps = opts?.preSteps ?? [];
  for (const step of preSteps) {
    if (step.kind === 'itemLaserRowClear') {
      const m: MatchDetectionLike = { clearIndices: step.indices, groups: 0 };
      const clearedCount = countClearablePieces(s, step.indices);

      const pre = runPreClearEffects(effects, s, m, ctx, events);
      s = pre.state;
      ctx = pre.ctx;

      events.push({ type: 'phase', phase: 'clear' });
      s = clearCellsAndPieces(s, step.indices);
      if (clearedCount > 0) events.push({ type: 'cleared', count: clearedCount });
      events.push({ type: 'cascadeStep', kind: 'itemLaserRowClear', row: step.row, indices: step.indices, cleared: clearedCount });

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

      didSomething = didSomething || clearedCount > 0 || step.indices.length > 0;
      continue;
    }

    const _exhaustive: never = step;
    void _exhaustive;
  }

  // ─────────────────────────────────────────────
  // Normal match resolve
  // ─────────────────────────────────────────────
  events.push({ type: 'phase', phase: 'detect' });
  const m = detect(s);

  if (m.clearIndices.length === 0) {
    return { state: s, events, didResolve: didSomething, chargedIds: ctx.chargedIds };
  }

  didSomething = true;

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

  return { state: s, events, didResolve: didSomething, chargedIds: ctx.chargedIds };
}
