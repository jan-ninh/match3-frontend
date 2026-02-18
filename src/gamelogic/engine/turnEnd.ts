// src/gamelogic/engine/turnEnd.ts
/**
 * Turn-end effects for various level mechanics.
 *
 * Level 02: Leak contamination spread
 * Level 04: Laser sweep (clear line + spawn hazards + select next warning)
 */
import type { Cell, EngineEvent, EngineState, LaserWarning, Piece, PieceId } from '../types';
import { countContamination, getOrthogonalNeighbors, getSpreadCandidates } from '../board';
import { rngNextInt } from '../rng';

import { clearCellsAndPieces } from '../cascade/clear';
import { applyGravity } from '../cascade/gravity';
import { applyRefill } from '../cascade/refill';

// ─────────────────────────────────────────────
// Deterministic RNG for turn effects (hash-based, does NOT advance rngState)
// ─────────────────────────────────────────────

function rngForTurnEffect(baseSeed: number, turnIndex: number, effectId: number): number {
  return ((baseSeed * 31) ^ (turnIndex * 17) ^ (effectId * 7)) >>> 0;
}

function pickDeterministic<T>(items: T[], seed: number): T {
  return items[seed % items.length]!;
}

// ─────────────────────────────────────────────
// Level 02: Spread Contamination (after board stabilizes)
// ─────────────────────────────────────────────

function spreadContamination(state: EngineState, events: EngineEvent[]): EngineState {
  const { width, height, cells, seed } = state;
  const turnIndex = state.turnIndex ?? 0;

  const spreadEveryNTurns = Math.max(1, state.spreadEveryNTurns ?? 1);

  // Check spreadEveryNTurns
  if (turnIndex % spreadEveryNTurns !== 0) return state;

  let nextCells = cells;
  let nextPieces = state.pieces;
  let changed = false;

  // Find all open leaks
  const openLeaks: { index: number; id: number }[] = [];
  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (obs?.kind === 'leak' && obs.progress < obs.required) {
      openLeaks.push({ index: i, id: obs.id });
    }
  }

  if (openLeaks.length === 0) return state;

  // Each open leak spreads once
  for (const leak of openLeaks) {
    const candidates = getSpreadCandidates(leak.index, width, height, nextCells);

    if (candidates.length === 0) {
      events.push({ type: 'spreadTick', leakId: leak.id, targetIndex: null });
      continue;
    }

    const rng = rngForTurnEffect(seed, turnIndex, leak.id);
    const targetIndex = pickDeterministic(candidates, rng);

    if (!changed) {
      nextCells = cells.slice();
      changed = true;
    }

    const targetCell = nextCells[targetIndex]!;

    // Remove piece if present
    if (targetCell.pieceId !== null) {
      nextPieces = { ...nextPieces };
      delete nextPieces[targetCell.pieceId];
    }

    // Place contamination
    nextCells[targetIndex] = {
      blocked: true,
      pieceId: null,
      obstacle: { kind: 'contamination' },
    };

    events.push({ type: 'spreadTick', leakId: leak.id, targetIndex });
    events.push({ type: 'contaminationSpawned', index: targetIndex, leakId: leak.id });
  }

  if (changed) {
    return { ...state, cells: nextCells, pieces: nextPieces };
  }

  return state;
}

// ─────────────────────────────────────────────
// Level 04: Laser Sweep Logic
// ─────────────────────────────────────────────

/**
 * Get all cell indices on a line (row or column).
 */
function getLineIndices(warning: LaserWarning, width: number, height: number): number[] {
  const indices: number[] = [];

  if (warning.kind === 'row') {
    const y = warning.index;
    for (let x = 0; x < width; x++) indices.push(y * width + x);
  } else {
    const x = warning.index;
    for (let y = 0; y < height; y++) indices.push(y * width + x);
  }

  return indices;
}

/**
 * Immune cells to sweep overwrite.
 */
function isSweepImmuneCell(cell: Cell): boolean {
  const obs = cell.obstacle;
  if (!obs) return false;
  return obs.kind === 'terminal' || obs.kind === 'objectiveTerminal';
}

/**
 * Execute laser sweep on the warned line.
 *
 * IMPORTANT: Use the same clear semantics as the working item laser:
 * - clear via `clearCellsAndPieces` to ensure pieces are truly removed
 * - run gravity/refill immediately so cleared tiles actually disappear / settle
 */
function executeLaserSweep(state: EngineState, events: EngineEvent[]): EngineState {
  const { laserWarning, width, height, cells } = state;

  const sweepContaminationCount = state.sweepContaminationCount ?? 0;
  const sweepFirewallCount = state.sweepFirewallCount ?? 0;

  if (!laserWarning) return state;

  events.push({ type: 'laserSweepStart', kind: laserWarning.kind, index: laserWarning.index });

  // Align with cascade-style phases for UI/VFX scheduling
  events.push({ type: 'phase', phase: 'clear' });

  const lineIndices = getLineIndices(laserWarning, width, height);

  // Step A: Plan indices to clear (skip immune + blocked + obstacles)
  const indicesToClear: number[] = [];
  const clearedIndices: number[] = [];

  for (const idx of lineIndices) {
    const cell = cells[idx];
    if (!cell) continue;

    // Skip immune cells
    if (isSweepImmuneCell(cell)) continue;

    // Skip occupied cells (obstacles/blockers)
    if (cell.obstacle) continue;
    if (cell.blocked) continue;

    indicesToClear.push(idx);
    if (cell.pieceId !== null) clearedIndices.push(idx);
  }

  const clearedCount = clearedIndices.length;

  // Step B: Clear pieces on the line using canonical clear helper
  let s: EngineState = state;
  if (indicesToClear.length > 0) {
    s = clearCellsAndPieces(s, indicesToClear);
  }

  if (clearedCount > 0) {
    events.push({ type: 'laserSweepCleared', indices: clearedIndices });
    // Also emit the generic cleared signal so UI systems keyed on it react.
    events.push({ type: 'cleared', count: clearedCount });
  }

  // Step C: Eligible cells for hazard placement
  // IMPORTANT: only place hazards on "normal" cells, otherwise it can look like "nothing happened".
  let nextCells = s.cells.slice();
  let nextPieces: Record<PieceId, Piece> = { ...s.pieces };

  const eligibleForHazard = lineIndices.filter((idx) => {
    const cell = nextCells[idx];
    if (!cell) return false;
    if (isSweepImmuneCell(cell)) return false;
    if (cell.blocked) return false;
    if (cell.obstacle) return false;
    return true;
  });

  // Deterministic shuffle for hazard placement (advances rngState)
  const shuffled = eligibleForHazard.slice();
  let rngState = s.rngState;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const r = rngNextInt(rngState, i + 1);
    rngState = r.state;
    const j = r.value;
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  // Step D: Place hazards
  const totalHazards = sweepContaminationCount + sweepFirewallCount;
  const hazardIndices = shuffled.slice(0, Math.min(totalHazards, shuffled.length));

  const contaminationIndices: number[] = [];
  const firewallIndices: number[] = [];

  for (let i = 0; i < hazardIndices.length; i++) {
    const idx = hazardIndices[i]!;
    const cell = nextCells[idx]!;

    // Remove any piece that might still be there
    if (cell.pieceId !== null) {
      delete nextPieces[cell.pieceId];
    }

    if (i < sweepContaminationCount) {
      nextCells[idx] = {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'contamination' },
      };
      contaminationIndices.push(idx);
    } else {
      // NOTE: firewall spawned by sweep must not be interpreted as Level-01 spike.
      nextCells[idx] = {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'firewall', hp: 1, maxHp: 1, origin: 'sweep' },
      };
      firewallIndices.push(idx);
    }
  }

  if (contaminationIndices.length > 0 || firewallIndices.length > 0) {
    events.push({ type: 'laserSweepHazards', contaminationIndices, firewallIndices });
  }

  // Step E: Settle immediately (gravity/refill) so the sweep visibly "takes effect"
  const afterHazards: EngineState = {
    ...s,
    cells: nextCells,
    pieces: nextPieces,
    rngState,
  };

  events.push({ type: 'phase', phase: 'gravity' });
  const afterGravity = applyGravity(afterHazards);
  events.push({ type: 'gravity' });

  events.push({ type: 'phase', phase: 'refill' });
  const ref = applyRefill(afterGravity);
  events.push({ type: 'refilled', count: ref.spawned });

  events.push({ type: 'phase', phase: 'settle' });
  return ref.state;
}

function lineKey(w: LaserWarning): string {
  return `${w.kind}-${w.index}`;
}

function pushSweptLineToHistory(state: EngineState, swept: LaserWarning | null): EngineState {
  if (!swept) return state;
  const prev = state.lastSweptLines ?? [];
  const nextLastSwept = [swept, ...prev].slice(0, 2);
  return { ...state, lastSweptLines: nextLastSwept };
}

/**
 * Select next laser warning line.
 */
function selectNextLaserWarning(state: EngineState, events: EngineEvent[]): EngineState {
  const { width, height, cells, seed } = state;
  const turnIndex = state.turnIndex ?? 0;

  const lastSweptLines = state.lastSweptLines ?? [];
  const laserWarning = state.laserWarning ?? null;

  // Build candidate list: rows + cols
  const candidates: LaserWarning[] = [];
  for (let y = 0; y < height; y++) candidates.push({ kind: 'row', index: y });
  for (let x = 0; x < width; x++) candidates.push({ kind: 'col', index: x });

  // Filter out last 2 swept lines
  const recentSet = new Set(lastSweptLines.map(lineKey));
  let filtered = candidates.filter((c) => !recentSet.has(lineKey(c)));

  // Fallback: if all filtered out, use all
  if (filtered.length === 0) filtered = candidates;

  // Score each candidate by "normal cells" count (not blocked, not obstacle)
  const scored = filtered.map((candidate) => {
    const line = getLineIndices(candidate, width, height);
    let normalCount = 0;

    for (const idx of line) {
      const cell = cells[idx];
      if (!cell) continue;
      if (cell.blocked) continue;
      if (cell.obstacle) continue;
      normalCount++;
    }

    return { candidate, normalCount };
  });

  // Prefer lines with >= 6 normal cells
  const preferred = scored.filter((s) => s.normalCount >= 6);
  const pool = preferred.length > 0 ? preferred : scored;

  // Sort by normalCount desc, then by stable ID for determinism
  pool.sort((a, b) => {
    if (b.normalCount !== a.normalCount) return b.normalCount - a.normalCount;
    if (a.candidate.kind !== b.candidate.kind) return a.candidate.kind === 'row' ? -1 : 1;
    return a.candidate.index - b.candidate.index;
  });

  // Deterministic pick from top candidates (take top 4, pick one)
  const topN = pool.slice(0, Math.min(4, pool.length));
  const rng = ((seed * 41) ^ ((turnIndex + 1) * 23)) >>> 0;
  const pick = topN[rng % topN.length]!;
  const nextWarning = pick.candidate;

  // Update last swept lines (keep max 2)
  const nextLastSwept = laserWarning ? [laserWarning, ...lastSweptLines].slice(0, 2) : lastSweptLines;

  events.push({ type: 'laserWarningSet', kind: nextWarning.kind, index: nextWarning.index });

  return {
    ...state,
    laserWarning: nextWarning,
    lastSweptLines: nextLastSwept,
  };
}

// ─────────────────────────────────────────────
// Check contamination lose condition
// ─────────────────────────────────────────────

function checkContaminationLose(state: EngineState, events: EngineEvent[]): boolean {
  const threshold = state.contaminationLoseThreshold;
  if (threshold == null) return false;

  const count = countContamination(state.cells);
  if (count >= threshold) {
    events.push({ type: 'contaminationLose', count });
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────
// Count sealed leaks
// ─────────────────────────────────────────────

function countSealedLeaks(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    const obs = cell.obstacle;
    if (obs?.kind === 'leak' && obs.progress >= obs.required) {
      count++;
    }
  }
  return count;
}

function checkLeakWin(state: EngineState): boolean {
  if (state.leaksTotal === 0) return false;
  return state.leaksSealed >= state.leaksTotal;
}

function updateLeaksSealed(state: EngineState): EngineState {
  const sealed = countSealedLeaks(state.cells);
  if (sealed === state.leaksSealed) return state;
  return { ...state, leaksSealed: sealed };
}

// ─────────────────────────────────────────────
// Apply Turn End Effects (main export)
// ─────────────────────────────────────────────

export type TurnEndResult = {
  state: EngineState;
  events: EngineEvent[];
  leakWin: boolean;
  contaminationLose: boolean;
};

export function applyTurnEndEffects(state: EngineState): TurnEndResult {
  const events: EngineEvent[] = [];

  const prevTurnIndex = state.turnIndex ?? 0;
  const nextTurnIndex = prevTurnIndex + 1;
  let s: EngineState = { ...state, turnIndex: nextTurnIndex };

  events.push({ type: 'turnEnd', turnIndex: nextTurnIndex });

  // ─────────────────────────────────────────────
  // Level 02
  // ─────────────────────────────────────────────
  if (s.leaksTotal > 0) {
    s = updateLeaksSealed(s);

    if (checkLeakWin(s)) {
      return { state: s, events, leakWin: true, contaminationLose: false };
    }

    s = spreadContamination(s, events);
    s = updateLeaksSealed(s);
  }

  // ─────────────────────────────────────────────
  // Level 04
  // ─────────────────────────────────────────────
  if (s.sweepEnabled) {
    const n = Math.max(1, s.sweepEveryNTurns ?? 1);

    // We sweep on this turn-end when nextTurnIndex is a multiple of N (or N=1).
    const shouldSweepNow = n === 1 || nextTurnIndex % n === 0;

    // We show a warning ONLY during the single turn that immediately precedes the sweep.
    // That is: after this turn-end, the NEXT turn (nextTurnIndex+1) will be swept.
    const shouldWarnNow = n === 1 || (nextTurnIndex + 1) % n === 0;

    if (shouldSweepNow) {
      // Ensure a target line exists (rare: on first sweep if warning wasn't created).
      if (!s.laserWarning) {
        s = selectNextLaserWarning(s, events);
      }

      const swept = s.laserWarning ?? null;

      s = executeLaserSweep(s, events);

      // Track recently swept lines even if we don't immediately select a new warning.
      s = pushSweptLineToHistory(s, swept);

      if (n === 1) {
        // Sweep every turn: immediately select the next warning line for the next turn.
        // IMPORTANT: clear warning first so selectNextLaserWarning doesn't double-push history.
        s = selectNextLaserWarning({ ...s, laserWarning: null }, events);
      } else {
        // Hide warning for the non-warning turns.
        s = { ...s, laserWarning: null };
      }
    } else {
      // Not sweeping now: warning should exist only in the single pre-sweep turn.
      if (shouldWarnNow) {
        if (!s.laserWarning) s = selectNextLaserWarning(s, events);
      } else {
        if (s.laserWarning) s = { ...s, laserWarning: null };
      }
    }
  }

  // ─────────────────────────────────────────────
  // Check lose/win
  // ─────────────────────────────────────────────
  const contaminationLose = checkContaminationLose(s, events);
  const leakWin = checkLeakWin(s);

  return { state: s, events, leakWin, contaminationLose };
}

// ─────────────────────────────────────────────
// Adjacency Helpers for Cascade Integration
// ─────────────────────────────────────────────

export function getAdjacentObstacleIndices(
  clearIndices: number[],
  obstacleKind: 'contamination' | 'sealKit' | 'leak',
  width: number,
  height: number,
  cells: Cell[],
): number[] {
  const found = new Set<number>();
  const clearSet = new Set(clearIndices);

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === obstacleKind) {
        found.add(n);
      }
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}

export function getAdjacentOpenLeakIndices(clearIndices: number[], width: number, height: number, cells: Cell[]): number[] {
  const found = new Set<number>();
  const clearSet = new Set(clearIndices);

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === 'leak' && obs.progress < obs.required) {
        found.add(n);
      }
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}
