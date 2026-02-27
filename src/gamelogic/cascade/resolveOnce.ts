import type { EngineEvent, EngineState, Piece, PieceId } from '../types';
import type { ResolveOnceOpts, ResolveOnceResult } from './typesCascade';

import { detect } from './detect';
import { clearCellsAndPieces } from './clear';
import { applyGravity } from './gravity';
import { applyRefill } from './refill';

import { getCascadeEffectsForState } from './effects/registry';
import { runPostClearEffects, runPostGravityEffects, runPostRefillEffects, runPreClearEffects } from './effects/runEffects';

import { applyItemObstacleDamageAtIndices } from '../board/obstacles/itemObstacleDamage';

import { markEnemyRedAtIndices } from './marks/enemyRed';

import { rngForCascadeEffect, pickDeterministic } from './cascadeRng';
import { shouldSpawnKeycardsFromMatch4Stage } from '../scenarios/policies';

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

type MatchRunLike = {
  axis: 'h' | 'v';
  len: number;
  indices: number[];
};

function isValidBoardIndex(state: EngineState, index: number): boolean {
  return Number.isFinite(index) && index >= 0 && index < state.cells.length;
}

function canPlaceKeycardAt(state: EngineState, index: number): boolean {
  if (!isValidBoardIndex(state, index)) return false;
  const c = state.cells[index];
  if (!c) return false;
  if (c.blocked) return false;
  return true;
}

function hashMatch4Runs(runs: readonly MatchRunLike[]): number {
  let h = 0 >>> 0;

  for (const r of runs) {
    const len = clampInt(r.len, 0, 99);
    if (len < 4) continue;

    const axisBit = r.axis === 'h' ? 1 : 2;
    const first = r.indices.length > 0 ? clampInt(r.indices[0]!, 0, 1_000_000_000) : 0;
    const last = r.indices.length > 0 ? clampInt(r.indices[r.indices.length - 1]!, 0, 1_000_000_000) : 0;

    const v = ((axisBit * 13 + len * 7 + (first % 10_000) * 17 + (last % 10_000) * 19) >>> 0) >>> 0;
    h = (((h * 33) >>> 0) ^ v) >>> 0;
  }

  return h >>> 0;
}

function collectMatch4CandidateIndices(runs: readonly MatchRunLike[]): number[] {
  const set = new Set<number>();
  for (const r of runs) {
    const len = clampInt(r.len, 0, 99);
    if (len < 4) continue;
    for (const idx of r.indices) {
      set.add(idx | 0);
    }
  }
  return Array.from(set.values()).sort((a, b) => a - b);
}

function pickKeycardSpawnIndex(state: EngineState, runs: readonly MatchRunLike[], preferIndex: number | null): number | null {
  const candidates = collectMatch4CandidateIndices(runs).filter((i) => canPlaceKeycardAt(state, i));

  if (candidates.length === 0) return null;

  if (preferIndex !== null && canPlaceKeycardAt(state, preferIndex)) {
    return preferIndex;
  }

  const base = rngForCascadeEffect(state.seed, clampInt(state.turnIndex, 0, 1_000_000_000), 5001);
  const h = hashMatch4Runs(runs);
  const seed = (base ^ h) >>> 0;

  return pickDeterministic(candidates, seed);
}

function spawnKeycardAtIndex(state: EngineState, index: number): EngineState {
  if (!canPlaceKeycardAt(state, index)) return state;

  const cell = state.cells[index]!;
  const existingPid = cell.pieceId;

  // If there's already a keycard here, do not double-count totals.
  if (existingPid !== null) {
    const p = state.pieces[existingPid];
    if (p && p.type === 'keycard') return state;
  }

  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  // Remove any existing piece at the target index.
  if (existingPid !== null) {
    delete nextPieces[existingPid];
  }

  const keycardId = state.nextPieceId as PieceId;
  const nextPieceId = (state.nextPieceId | 0) + 1;

  nextPieces[keycardId] = {
    id: keycardId,
    type: 'keycard',
    cellIndex: index,
  };

  nextCells[index] = {
    ...nextCells[index]!,
    pieceId: keycardId,
  };

  return {
    ...state,
    cells: nextCells,
    pieces: nextPieces,
    nextPieceId,
    // For Level 05 this is dynamic: keycards are earned/spawned, not pre-placed.
    keycardsTotal: (state.keycardsTotal | 0) + 1,
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

    const runs: MatchRunLike[] = (m.runs ?? []).map((r) => ({ axis: r.axis, len: r.len, indices: r.indices }));

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

  // ─────────────────────────────────────────────
  // Level 05: Match4+ spawns keycards (engine-owned, deterministic)
  //
  // Rules:
  // - Trigger: any match run with len>=4 in this resolveOnce wave
  // - Swap-driven wave: preferKeycardSpawnIndex (swap destination) if provided
  // - Otherwise (cascade / item): pick deterministic slot among match4+ run indices
  // - Spawn happens after refill/settle so it does not affect objective clear counts
  // ─────────────────────────────────────────────
  if (s.pendingTurnCommit && shouldSpawnKeycardsFromMatch4Stage(s.levelId)) {
    const preferRaw = opts?.preferKeycardSpawnIndex;
    const prefer = typeof preferRaw === 'number' && Number.isFinite(preferRaw) ? (preferRaw | 0) : null;

    const spawnIndex = pickKeycardSpawnIndex(s, runs, prefer);
    if (spawnIndex !== null) {
      s = spawnKeycardAtIndex(s, spawnIndex);
    }
  }

  events.push({ type: 'phase', phase: 'settle' });

  return { state: s, events, didResolve: didSomething, chargedIds: ctx.chargedIds };
}
