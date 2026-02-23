import type { EngineEvent, EngineState } from '../types';
import type { ResolveOnceOpts, ResolveOnceResult } from './typesCascade';

import { detect } from './detect';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

import { applyItemObstacleDamageAtIndices } from '../board/obstacles/itemObstacleDamage';

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

function markEnemyRedAtIndices(state: EngineState, indices: number[]): EngineState {
  if (state.enemyMarkActive !== true) return state;

  let nextCells = state.cells;
  let changed = false;

  for (const idx of indices) {
    const c = nextCells[idx];
    if (!c || c.blocked) continue;

    if (c.mark === 'enemyRed') continue;

    if (!changed) {
      nextCells = state.cells.slice();
      changed = true;
    }

    nextCells[idx] = { ...c, mark: 'enemyRed' };
  }

  if (!changed) return state;
  return { ...state, cells: nextCells };
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
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
        // Enemy mode: paint cleared slots red.
        s = markEnemyRedAtIndices(s, step.indices);

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
        // Enemy mode: paint cleared slots red.
        s = markEnemyRedAtIndices(s, step.indices);

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

  events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

  // NEW: Emit per-match-group observability so UI/SFX can distinguish match3/match4/match5.
  // This is deterministic and engine-owned (no UI inference needed).
  const itemCommit = s.pendingTurnCommit && s.pendingTurnCommit.kind === 'item' ? s.pendingTurnCommit : null;

  if (m.runs && m.runs.length > 0) {
    const turn = clampInt(s.turnIndex, 0, 1_000_000_000);

    const matchGroupIds: string[] = [];
    let maxLen = 0;
    let len3 = 0;
    let len4 = 0;
    let len5 = 0;
    let len6Plus = 0;

    for (const r of m.runs) {
      const len = clampInt(r.len, 0, 99);
      const indices = r.indices.slice();

      const first = indices.length > 0 ? clampInt(indices[0], -1, 1_000_000_000) : -1;
      const last = indices.length > 0 ? clampInt(indices[indices.length - 1], -1, 1_000_000_000) : -1;

      // Include turn + axis + endpoints so dedupe IDs won't collide across turns.
      const id = `t${turn}:a${r.axis}:s${first}:e${last}:l${len}`;

      matchGroupIds.push(id);
      maxLen = Math.max(maxLen, len);

      if (len === 3) len3 += 1;
      else if (len === 4) len4 += 1;
      else if (len === 5) len5 += 1;
      else if (len >= 6) len6Plus += 1;

      events.push({
        type: 'matchGroup',
        id,
        axis: r.axis,
        len,
        indices,
      });
    }

    // NEW: Summary event for Level goals / analytics to avoid per-consumer inference.
    // Policy: emit at most once per *item* turn commit (first detected wave only).
    if (itemCommit && itemCommit.matchOutcomeEmitted !== true && itemCommit.key !== undefined && itemCommit.requestId !== undefined) {
      // Persist guardrail in state so repeated resolveOnce calls in the same commit won't double-emit.
      const nextItemCommit = { ...itemCommit, matchOutcomeEmitted: true };
      let nextState: EngineState = { ...s, pendingTurnCommit: nextItemCommit };

      // Level 09: ensure timer is initialized once we have a real nowMs.
      if ((s.level9TimerStartSec | 0) > 0 && (nextState.level9TimerDeadlineAtMs | 0) <= 0 && (s.nowMs | 0) > 0) {
        const startSec = s.level9TimerStartSec | 0;
        if (startSec > 0) {
          nextState = { ...nextState, level9TimerStage: 0, level9TimerDeadlineAtMs: s.nowMs + startSec * 1000 };
        }
      }

      // Level 09: decrement countdown once per qualifying RowLaser item commit (Match4+).
      if (itemCommit.key === 'laserRow' && maxLen >= 4 && (s.laserRowMatch4Target | 0) > 0) {
        const prevRemaining = s.laserRowMatch4Remaining | 0;
        if (prevRemaining > 0) {
          const nextRemaining = prevRemaining - 1;
          nextState = { ...nextState, laserRowMatch4Remaining: nextRemaining };

          // Timer reset rules:
          // - after 1st success => reset to level9TimerAfterFirstSec
          // - after 2nd+ success => reset to level9TimerAfterSecondSec
          if ((s.level9TimerStartSec | 0) > 0 && (s.nowMs | 0) > 0) {
            const prevStage = s.level9TimerStage | 0;
            const nextStage = prevStage >= 2 ? 2 : prevStage + 1;

            const resetSec = nextStage === 1 ? (s.level9TimerAfterFirstSec | 0) : (s.level9TimerAfterSecondSec | 0);
            if (resetSec > 0) {
              nextState = {
                ...nextState,
                level9TimerStage: nextStage,
                level9TimerDeadlineAtMs: s.nowMs + resetSec * 1000,
              };
            }
          }
        }
      }

      s = nextState;

      events.push({
        type: 'itemCausedMatch',
        key: itemCommit.key,
        requestId: itemCommit.requestId,
        maxLen,
        len3,
        len4,
        len5,
        len6Plus,
        matchGroupIds,
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

  // Enemy mode: paint cleared slots red.
  s = markEnemyRedAtIndices(s, m.clearIndices);

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
