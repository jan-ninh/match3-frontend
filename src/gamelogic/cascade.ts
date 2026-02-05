import type { EngineEvent, EngineState, Piece, PieceId, PieceType } from './types';
import type { EnginePhase } from './phases';
import { detectMatches, hasAnyMoves, wouldCreateMatchAt } from './match';
import { rngNextInt, rngShuffleInPlace } from './rng';
import { setPhase } from './phaseState';
import { assertPhaseInvariants } from './invariants';

type BoardView = Pick<EngineState, 'width' | 'height' | 'cells' | 'pieces'>;

function clearCellsAndPieces(state: EngineState, indices: number[]): EngineState {
  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  for (const idx of indices) {
    const c = nextCells[idx];
    if (!c || c.blocked) continue;
    const pid = c.pieceId;
    if (pid !== null) {
      delete nextPieces[pid];
      nextCells[idx] = { ...c, pieceId: null };
    }
  }

  return { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };
}

function applyGravity(state: EngineState): EngineState {
  const { width, height } = state;

  const nextCells = state.cells.map((c) => ({ blocked: c.blocked, pieceId: null as PieceId | null }));
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  const size = width * height;

  for (let x = 0; x < width; x++) {
    let writeY = height - 1;

    for (let y = height - 1; y >= 0; y--) {
      const idx = y * width + x;
      const c = state.cells[idx]!;
      if (c.blocked) {
        writeY = y - 1;
        continue;
      }
      if (c.pieceId === null) continue;

      while (writeY >= 0) {
        const wIdx = writeY * width + x;
        const wc = state.cells[wIdx]!;
        if (!wc.blocked) break;
        writeY--;
      }
      if (writeY < 0) break;

      const targetIdx = writeY * width + x;
      const pid = c.pieceId as PieceId;

      nextCells[targetIdx] = { ...nextCells[targetIdx]!, pieceId: pid };
      nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: targetIdx };

      writeY--;
    }
  }

  // keep blocked cells blocked (already), ensure they stay empty
  for (let i = 0; i < size; i++) {
    if (nextCells[i]!.blocked) nextCells[i]!.pieceId = null;
  }

  return { ...state, cells: nextCells, pieces: nextPieces };
}

function applyRefill(state: EngineState): { state: EngineState; spawned: number } {
  const { width, height, allowedTypes } = state;

  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  let rngState = state.rngState;
  let nextPieceId = state.nextPieceId;
  let spawned = 0;

  const boardView: BoardView = { width, height, cells: nextCells, pieces: nextPieces };

  // spawn in all empty, non-blocked cells (after gravity these are spawn-zones implicitly)
  for (let idx = 0; idx < nextCells.length; idx++) {
    const c = nextCells[idx]!;
    if (c.blocked || c.pieceId !== null) continue;

    let chosen: PieceType | null = null;

    for (let attempt = 0; attempt < 24; attempt++) {
      const r = rngNextInt(rngState, allowedTypes.length);
      rngState = r.state;
      const cand = allowedTypes[r.value]!;
      if (!wouldCreateMatchAt(boardView, idx, cand)) {
        chosen = cand;
        break;
      }
    }

    if (!chosen) {
      const r = rngNextInt(rngState, allowedTypes.length);
      rngState = r.state;
      chosen = allowedTypes[r.value]!;
    }

    const id = nextPieceId as PieceId;
    nextPieceId++;

    nextPieces[id] = { id, type: chosen, cellIndex: idx };
    nextCells[idx] = { ...c, pieceId: id };
    spawned++;
  }

  return {
    state: { ...state, cells: nextCells, pieces: nextPieces, nextPieceId, rngState },
    spawned,
  };
}

function shuffleUntilValid(state: EngineState, maxAttempts: number): { state: EngineState; attempts: number } {
  const indices: number[] = [];
  const pieceIds: PieceId[] = [];

  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i]!;
    if (c.blocked) continue;
    if (c.pieceId === null) continue;
    indices.push(i);
    pieceIds.push(c.pieceId as PieceId);
  }

  let rngState = state.rngState;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const perm = pieceIds.slice();
    const sh = rngShuffleInPlace(rngState, perm);
    rngState = sh.state;

    const nextCells = state.cells.map((c) => ({ blocked: c.blocked, pieceId: null as PieceId | null }));
    const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

    for (let k = 0; k < indices.length; k++) {
      const idx = indices[k]!;
      const pid = perm[k]!;
      nextCells[idx] = { ...nextCells[idx]!, pieceId: pid };
      nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: idx };
    }

    const candidate: EngineState = {
      ...state,
      cells: nextCells,
      pieces: nextPieces,
      rngState,
      selectedIndex: null,
    };

    const m = detectMatches(candidate);
    if (m.clearIndices.length !== 0) continue;

    if (!hasAnyMoves(candidate)) continue;

    return { state: candidate, attempts: attempt };
  }

  // fallback: accept last shuffled state even if imperfect (still deterministic)
  const perm = pieceIds.slice();
  const sh = rngShuffleInPlace(rngState, perm);
  rngState = sh.state;

  const nextCells = state.cells.map((c) => ({ blocked: c.blocked, pieceId: null as PieceId | null }));
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  for (let k = 0; k < indices.length; k++) {
    const idx = indices[k]!;
    const pid = perm[k]!;
    nextCells[idx] = { ...nextCells[idx]!, pieceId: pid };
    nextPieces[pid] = { ...nextPieces[pid]!, cellIndex: idx };
  }

  return {
    state: { ...state, cells: nextCells, pieces: nextPieces, rngState, selectedIndex: null },
    attempts: maxAttempts,
  };
}

export function stabilizeBoard(
  state: EngineState,
  opts?: { maxResolveLoops?: number; maxShuffleAttempts?: number },
): { state: EngineState; events: EngineEvent[] } {
  const maxResolveLoops = opts?.maxResolveLoops ?? 64;
  const maxShuffleAttempts = opts?.maxShuffleAttempts ?? 200;

  let s: EngineState = state;
  const events: EngineEvent[] = [];

  const dev = import.meta.env.DEV;
  const devAssert = (ctx: string) => {
    if (dev) assertPhaseInvariants(s, ctx);
  };

  const toPhase = (phase: EnginePhase) => {
    s = setPhase(s, phase, events);
    devAssert(`stabilize:${phase}`);
  };

  // ensure inputLock (but avoid duplicate phase event if already in inputLock)
  if (s.phase !== 'inputLock') {
    toPhase('inputLock');
  } else {
    s = setPhase(s, 'inputLock');
    devAssert('stabilize:inputLock');
  }

  // resolve-loop: detect -> mark -> clear -> gravity -> refill -> settle -> repeat
  for (let loop = 0; loop < maxResolveLoops; loop++) {
    toPhase('detect');
    const m = detectMatches(s);
    if (m.clearIndices.length === 0) break;

    events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

    toPhase('mark');
    // (future) spawnPlan/specials go here

    toPhase('clear');
    s = clearCellsAndPieces(s, m.clearIndices);
    devAssert('stabilize:clearCellsAndPieces');
    events.push({ type: 'cleared', count: m.clearIndices.length });

    toPhase('gravity');
    s = applyGravity(s);
    devAssert('stabilize:applyGravity');
    events.push({ type: 'gravity' });

    toPhase('refill');
    const ref = applyRefill(s);
    s = ref.state;
    devAssert('stabilize:applyRefill');
    events.push({ type: 'refilled', count: ref.spawned });

    toPhase('settle');
    // (instant settle for now)
  }

  // deadlock -> shuffle -> resolve-loop again (to guarantee match-free)
  toPhase('deadlockCheck');
  const hasMove = hasAnyMoves(s);
  events.push({ type: 'deadlockCheck', hasMove });

  if (!hasMove) {
    toPhase('shuffle');
    const sh = shuffleUntilValid(s, maxShuffleAttempts);
    s = sh.state;
    devAssert('stabilize:shuffleUntilValid');
    events.push({ type: 'shuffled', attempts: sh.attempts });

    // post-shuffle safety resolve
    for (let loop = 0; loop < maxResolveLoops; loop++) {
      toPhase('detect');
      const m = detectMatches(s);
      if (m.clearIndices.length === 0) break;

      events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

      toPhase('mark');

      toPhase('clear');
      s = clearCellsAndPieces(s, m.clearIndices);
      devAssert('stabilize:postShuffle:clearCellsAndPieces');
      events.push({ type: 'cleared', count: m.clearIndices.length });

      toPhase('gravity');
      s = applyGravity(s);
      devAssert('stabilize:postShuffle:applyGravity');
      events.push({ type: 'gravity' });

      toPhase('refill');
      const ref = applyRefill(s);
      s = ref.state;
      devAssert('stabilize:postShuffle:applyRefill');
      events.push({ type: 'refilled', count: ref.spawned });

      toPhase('settle');
    }
  }

  toPhase('idle');

  return { state: s, events };
}
