// src/gamelogic/engine/turnEnd.ts
import type { Cell, EngineEvent, EngineState } from '../types';
import { countContamination, getOrthogonalNeighbors, getSpreadCandidates } from '../board';

// ─────────────────────────────────────────────
// Deterministic RNG for turn effects
// ─────────────────────────────────────────────

function rngForTurnEffect(baseSeed: number, turnIndex: number, effectId: number): number {
  return ((baseSeed * 31) ^ (turnIndex * 17) ^ (effectId * 7)) >>> 0;
}

function pickDeterministic<T>(items: T[], seed: number): T {
  return items[seed % items.length]!;
}

// ─────────────────────────────────────────────
// Spread Contamination (called after board stabilizes)
// ─────────────────────────────────────────────

function spreadContamination(state: EngineState, events: EngineEvent[]): EngineState {
  const { width, height, cells, seed, turnIndex, spreadEveryNTurns } = state;

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

// ─────────────────────────────────────────────
// Check leak win condition
// ─────────────────────────────────────────────

function checkLeakWin(state: EngineState): boolean {
  if (state.leaksTotal === 0) return false;
  return state.leaksSealed >= state.leaksTotal;
}

// ─────────────────────────────────────────────
// Update leaksSealed count
// ─────────────────────────────────────────────

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

  // Increment turn index
  const nextTurnIndex = state.turnIndex + 1;
  let s: EngineState = { ...state, turnIndex: nextTurnIndex };

  events.push({ type: 'turnEnd', turnIndex: nextTurnIndex });

  // Update leaksSealed count before spread
  s = updateLeaksSealed(s);

  // Check win before spread (player sealed all leaks this turn)
  if (checkLeakWin(s)) {
    return { state: s, events, leakWin: true, contaminationLose: false };
  }

  // Spread contamination from open leaks
  s = spreadContamination(s, events);

  // Update leaksSealed again (shouldn't change, but for consistency)
  s = updateLeaksSealed(s);

  // Check contamination lose
  const contaminationLose = checkContaminationLose(s, events);

  // Check win again (edge case: shouldn't happen after spread, but be safe)
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
