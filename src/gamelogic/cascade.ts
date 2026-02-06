import type { EngineEvent, EngineState, Piece, PieceId, PieceType } from './types';
import type { EnginePhase } from './phases';
import { detectMatches, hasAnyMoves, wouldCreateMatchAt } from './match';
import { rngNextInt, rngShuffleInPlace } from './rng';
import { setPhase } from './phaseState';
import { assertPhaseInvariants } from './invariants';

type BoardView = Pick<EngineState, 'width' | 'height' | 'cells' | 'pieces'>;

function setGateOpen(state: EngineState, open: boolean, events?: EngineEvent[]): EngineState {
  if (state.gateOpen === open) return state;

  let nextCells = state.cells;
  if (state.gateIndices.length) {
    nextCells = nextCells.slice();
    for (const idx of state.gateIndices) {
      const c = nextCells[idx];
      if (!c) continue;
      nextCells[idx] = { ...c, blocked: true, pieceId: null, obstacle: 'gate', gateOpen: open };
    }
  }

  if (open) events?.push({ type: 'gateOpened' });
  return { ...state, gateOpen: open, cells: nextCells };
}

function applyFirewallDamage(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  if (state.breachesRemaining <= 0) return state;
  if (clearIndices.length === 0) return state;

  const clear = new Set<number>(clearIndices);
  const { width, height } = state;

  let nextCells = state.cells;
  let changed = false;

  let remaining = state.breachesRemaining;

  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i]!;
    if (c.obstacle !== 'firewall') continue;

    const hp = typeof c.hp === 'number' ? c.hp : 0;
    if (hp <= 0) continue;

    const x = i % width;
    const y = Math.floor(i / width);

    const hit =
      (x > 0 && clear.has(i - 1)) ||
      (x + 1 < width && clear.has(i + 1)) ||
      (y > 0 && clear.has(i - width)) ||
      (y + 1 < height && clear.has(i + width));

    if (!hit) continue;

    const nextHp = hp - 1;

    if (!changed) {
      nextCells = state.cells.slice();
      changed = true;
    }

    if (nextHp > 0) {
      nextCells[i] = { ...c, hp: nextHp };
      events.push({ type: 'firewallDamaged', index: i, hp: nextHp });
      continue;
    }

    // destroyed => becomes a normal empty cell (unblocked)
    nextCells[i] = { blocked: false, pieceId: null };
    remaining = Math.max(0, remaining - 1);
    events.push({ type: 'firewallDestroyed', index: i });
  }

  let nextState = state;

  if (changed || remaining !== state.breachesRemaining) {
    nextState = { ...nextState, cells: nextCells, breachesRemaining: remaining };
  } else {
    nextState = { ...nextState, breachesRemaining: remaining };
  }

  if (remaining <= 0 && !nextState.gateOpen) {
    nextState = setGateOpen(nextState, true, events);
  }

  return nextState;
}

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

  const nextCells = state.cells.map((c) => ({ ...c, pieceId: null as PieceId | null }));
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

export type ResolveOnceResult = {
  state: EngineState;
  events: EngineEvent[];
  didResolve: boolean;
};

export function resolveOnce(state: EngineState): ResolveOnceResult {
  let s = state;
  const events: EngineEvent[] = [];

  events.push({ type: 'phase', phase: 'detect' });
  const m = detectMatches(s);
  if (m.clearIndices.length === 0) {
    return { state: s, events, didResolve: false };
  }

  events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });
  s = applyFirewallDamage(s, m.clearIndices, events);

  events.push({ type: 'phase', phase: 'clear' });
  s = clearCellsAndPieces(s, m.clearIndices);
  events.push({ type: 'cleared', count: m.clearIndices.length });

  events.push({ type: 'phase', phase: 'gravity' });
  s = applyGravity(s);
  events.push({ type: 'gravity' });

  events.push({ type: 'phase', phase: 'refill' });
  const ref = applyRefill(s);
  s = ref.state;
  events.push({ type: 'refilled', count: ref.spawned });

  events.push({ type: 'phase', phase: 'settle' });

  return { state: s, events, didResolve: true };
}

export function shuffleUntilValid(state: EngineState, maxAttempts: number): { state: EngineState; attempts: number } {
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

    const nextCells = state.cells.map((c) => ({ ...c, pieceId: null as PieceId | null }));
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

  const nextCells = state.cells.map((c) => ({ ...c, pieceId: null as PieceId | null }));
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
    s = applyFirewallDamage(s, m.clearIndices, events);

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
      s = applyFirewallDamage(s, m.clearIndices, events);

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



