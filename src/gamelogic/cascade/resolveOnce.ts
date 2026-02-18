// src/gamelogic/cascade/resolveOnce.ts
import type { EngineEvent, EngineState } from '../types';
import type { ResolveOnceOpts, ResolveOnceResult } from './typesCascade';

import { detect } from './detect';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

// type MatchDetectionLike = { clearIndices: number[]; groups: number };

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

  const effectsEnabled = state.cascadeEffectPolicy !== 'noObjectives';
  const effects = getCascadeEffectsForState(s);
  let ctx = { chargedIds };

  let didSomething = false;

  // ─────────────────────────────────────────────
  // First-class preSteps (e.g. item clears) BEFORE detect
  // ─────────────────────────────────────────────
  const preSteps = opts?.preSteps ?? [];
  for (const step of preSteps) {
    switch (step.kind) {
      case 'itemLaserRowClear': {
        const clearedCount = countClearablePieces(s, step.indices);

        // NOTE: Item-driven clear must not progress objectives/level mechanics.
        // Therefore: do NOT run cascade effects here (even if effectsEnabled === true).
        events.push({ type: 'phase', phase: 'clear' });
        s = clearCellsAndPieces(s, step.indices);
        if (clearedCount > 0) events.push({ type: 'cleared', count: clearedCount });
        events.push({ type: 'cascadeStep', kind: 'itemLaserRowClear', row: step.row, indices: step.indices, cleared: clearedCount });

        events.push({ type: 'phase', phase: 'gravity' });
        s = applyGravity(s);
        events.push({ type: 'gravity' });

        events.push({ type: 'phase', phase: 'refill' });
        const ref = applyRefill(s);
        s = ref.state;
        events.push({ type: 'refilled', count: ref.spawned });

        events.push({ type: 'phase', phase: 'settle' });

        didSomething = didSomething || clearedCount > 0 || step.indices.length > 0;
        continue;
      }

      default: {
        // Fail-fast: if preSteps includes kinds this resolver doesn't handle yet,
        // we want a hard signal instead of silently doing the wrong thing.
        throw new Error(`resolveOnce: unsupported preStep kind: ${step.kind}`);
      }
    }
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
  if (effectsEnabled) {
    const pre = runPreClearEffects(effects, s, m, ctx, events);
    s = pre.state;
    ctx = pre.ctx;
  }

  events.push({ type: 'phase', phase: 'clear' });
  s = clearCellsAndPieces(s, m.clearIndices);
  events.push({ type: 'cleared', count: m.clearIndices.length });

  if (effectsEnabled) {
    const postClear = runPostClearEffects(effects, s, ctx, events);
    s = postClear.state;
    ctx = postClear.ctx;
  }

  events.push({ type: 'phase', phase: 'gravity' });
  s = applyGravity(s);
  events.push({ type: 'gravity' });

  if (effectsEnabled) {
    const postGravity = runPostGravityEffects(effects, s, ctx, events);
    s = postGravity.state;
    ctx = postGravity.ctx;
  }

  events.push({ type: 'phase', phase: 'refill' });
  const ref = applyRefill(s);
  s = ref.state;
  events.push({ type: 'refilled', count: ref.spawned });

  if (effectsEnabled) {
    const postRefill = runPostRefillEffects(effects, s, ctx, events);
    s = postRefill.state;
    ctx = postRefill.ctx;
  }

  events.push({ type: 'phase', phase: 'settle' });

  return { state: s, events, didResolve: didSomething, chargedIds: ctx.chargedIds };
}
