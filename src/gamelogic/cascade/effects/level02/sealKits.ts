// src/gamelogic/cascade/effects/level02/sealKits.ts
import type { EngineEvent, EngineState, Piece, PieceId } from '../../../types';
import type { CascadeEffect } from '../effectTypes';
import { countSealKits, getNearestOpenLeakId, getOrthogonalNeighbors } from '../../../board';
import { rngForCascadeEffect, pickDeterministic } from '../deterministicRng';
import { uniqSorted } from '../selection';

function triggerAdjacentSealKits(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  if (clearIndices.length === 0) return state;

  const { width, height, cells } = state;
  const clearSet = new Set(clearIndices);
  const kits: number[] = [];

  for (const clearIdx of clearIndices) {
    for (const n of getOrthogonalNeighbors(clearIdx, width, height)) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === 'sealKit') kits.push(n);
    }
  }

  const unique = uniqSorted(kits);
  if (unique.length === 0) return state;

  const nextCells = cells.slice();
  let leaksSealed = state.leaksSealed;

  for (const kitIdx of unique) {
    const targetLeakId = getNearestOpenLeakId(kitIdx, width, nextCells);

    if (targetLeakId === null) {
      nextCells[kitIdx] = { blocked: false, pieceId: null };
      continue;
    }

    let leakCellIdx = -1;
    for (let i = 0; i < nextCells.length; i++) {
      const obs = nextCells[i]?.obstacle;
      if (obs?.kind === 'leak' && obs.id === targetLeakId) {
        leakCellIdx = i;
        break;
      }
    }

    if (leakCellIdx < 0) {
      nextCells[kitIdx] = { blocked: false, pieceId: null };
      continue;
    }

    const leakCell = nextCells[leakCellIdx]!;
    const leakObs = leakCell.obstacle;
    if (leakObs?.kind !== 'leak') {
      nextCells[kitIdx] = { blocked: false, pieceId: null };
      continue;
    }

    const newProgress = leakObs.progress + 1;
    const isSealed = newProgress >= leakObs.required;

    nextCells[leakCellIdx] = { ...leakCell, obstacle: { ...leakObs, progress: newProgress } };
    nextCells[kitIdx] = { blocked: false, pieceId: null };

    events.push({ type: 'sealKitTriggered', index: kitIdx, targetLeakId });
    events.push({ type: 'leakPatched', leakId: targetLeakId, progress: newProgress, required: leakObs.required });

    if (isSealed) {
      events.push({ type: 'leakSealed', leakId: targetLeakId });
      leaksSealed++;
    }
  }

  return { ...state, cells: nextCells, leaksSealed };
}

function spawnSealKitsNearLeaks(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  if (clearIndices.length === 0) return state;

  const { width, height, cells, seed, turnIndex, maxSealKitsOnBoard } = state;
  const clearSet = new Set(clearIndices);

  const leaksToSpawnFor: { leakIdx: number; leakId: number }[] = [];

  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (obs?.kind !== 'leak') continue;
    if (obs.progress >= obs.required) continue;

    const neighbors = getOrthogonalNeighbors(i, width, height);
    if (neighbors.some((n) => clearSet.has(n))) {
      leaksToSpawnFor.push({ leakIdx: i, leakId: obs.id });
    }
  }

  if (leaksToSpawnFor.length === 0) return state;

  const nextCells = cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  let spawned = 0;
  let kitsOnBoard = countSealKits(nextCells);

  for (const { leakIdx, leakId } of leaksToSpawnFor) {
    if (maxSealKitsOnBoard > 0 && kitsOnBoard >= maxSealKitsOnBoard) break;

    const neighbors = getOrthogonalNeighbors(leakIdx, width, height);
    const freeNeighbors = neighbors.filter((n) => {
      const c = nextCells[n];
      if (!c) return false;
      if (c.blocked) return false;
      if (c.obstacle) return false;
      return true; // may replace a piece
    });

    if (freeNeighbors.length === 0) continue;

    const rng = rngForCascadeEffect(seed, turnIndex, leakId + spawned * 100);
    const spawnIdx = pickDeterministic(freeNeighbors, rng);

    const targetCell = nextCells[spawnIdx]!;
    if (targetCell.pieceId !== null) {
      delete nextPieces[targetCell.pieceId];
    }

    nextCells[spawnIdx] = { blocked: true, pieceId: null, obstacle: { kind: 'sealKit' } };
    events.push({ type: 'sealKitSpawned', index: spawnIdx, leakId });

    spawned++;
    kitsOnBoard++;
  }

  if (spawned === 0) return state;
  return { ...state, cells: nextCells, pieces: nextPieces };
}

export const sealKitsEffect: CascadeEffect = {
  id: 'level02.sealKits',
  preClear: ({ state, match, ctx, events }) => {
    let s = state;
    s = triggerAdjacentSealKits(s, match.clearIndices, events);
    s = spawnSealKitsNearLeaks(s, match.clearIndices, events);
    return { state: s, ctx };
  },
};
