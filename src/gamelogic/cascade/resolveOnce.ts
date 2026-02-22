import type { EngineEvent, EngineState } from '../types';
import type { ResolveOnceOpts, ResolveOnceResult } from './typesCascade';

import { detect } from './detect';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

import { applyItemObstacleDamageAtIndices } from '../board/obstacles/itemObstacleDamage';

import { LEVEL07_TUNING } from '../levels/level-07';

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

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function matchRushUnitsForRunLen(len: number): number {
  const l = clampInt(len, 0, 99);
  if (l >= 5) return LEVEL07_TUNING.matchUnits.match5;
  if (l === 4) return LEVEL07_TUNING.matchUnits.match4;
  if (l === 3) return LEVEL07_TUNING.matchUnits.match3;
  return 0;
}

function addMatchRushUnitsFromRuns(state: EngineState, runs: ReadonlyArray<{ len: number }> | undefined): EngineState {
  if ((state.matchRushTargetUnits | 0) <= 0) return state;
  if (state.phase === 'init') return state;
  if (!runs || runs.length === 0) return state;

  let baseUnits = 0;
  for (const r of runs) {
    baseUnits += matchRushUnitsForRunLen(r.len);
  }
  if (baseUnits <= 0) return state;

  const gained = baseUnits * LEVEL07_TUNING.globalMultiplier;
  if (gained <= 0) return state;

  return {
    ...state,
    matchRushUnits: (state.matchRushUnits | 0) + gained,
  };
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
        // Item-driven clear must not progress objectives/level mechanics via cascade effects.
        // Instead, apply explicit item obstacle damage rules (per-level config).
        s = applyItemObstacleDamageAtIndices(s, 'laserRow', step.indices, events);

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

      case 'itemBomb3x3Blast': {
        // Item-driven clear must not progress objectives/level mechanics via cascade effects.
        // Instead, apply explicit item obstacle damage rules (per-level config).
        s = applyItemObstacleDamageAtIndices(s, 'bomb3x3', step.indices, events);

        const clearedCount = countClearablePieces(s, step.indices);

        // NOTE: Item-driven clear must not progress objectives/level mechanics.
        // Therefore: do NOT run cascade effects here (even if effectsEnabled === true).
        events.push({ type: 'phase', phase: 'clear' });
        s = clearCellsAndPieces(s, step.indices);
        if (clearedCount > 0) events.push({ type: 'cleared', count: clearedCount });
        events.push({
          type: 'cascadeStep',
          kind: 'itemBomb3x3Blast',
          center: step.center,
          indices: step.indices,
          cleared: clearedCount,
        });

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
        const kind = step.kind;
        const _exhaustive: never = kind;
        void _exhaustive;

        throw new Error(`resolveOnce: unsupported preStep kind: ${String(kind)}`);
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

  // Level 07: Match Rush progress is engine-owned.
  // Count match groups by size and apply global multiplier.
  s = addMatchRushUnitsFromRuns(s, m.runs);

  events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

  // NEW: Emit per-match-group observability so UI/SFX can distinguish match3/match4/match5.
  // This is deterministic and engine-owned (no UI inference needed).
  if (m.runs && m.runs.length > 0) {
    const turn = clampInt(s.turnIndex, 0, 1_000_000_000);

    for (const r of m.runs) {
      const len = clampInt(r.len, 0, 99);
      const indices = r.indices.slice();

      const first = indices.length > 0 ? clampInt(indices[0], -1, 1_000_000_000) : -1;
      const last = indices.length > 0 ? clampInt(indices[indices.length - 1], -1, 1_000_000_000) : -1;

      // Include turn + axis + endpoints so dedupe IDs won't collide across turns.
      const id = `t${turn}:a${r.axis}:s${first}:e${last}:l${len}`;

      events.push({
        type: 'matchGroup',
        id,
        axis: r.axis,
        len,
        indices,
      });
    }
  }

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
