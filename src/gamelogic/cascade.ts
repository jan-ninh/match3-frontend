// src/gamelogic/cascade.ts
import type { EngineEvent, EngineState, Piece, PieceId, PieceType } from './types';
import type { EnginePhase } from './phases';
import { detectMatches, hasAnyMoves, wouldCreateMatchAt } from './match';
import { rngNextInt, rngShuffleInPlace } from './rng';
import { setPhase } from './phaseState';
import { assertPhaseInvariants } from './invariants';
import { countSealKits, getNearestOpenLeakId, getOrthogonalNeighbors } from './board';

type BoardView = Pick<EngineState, 'width' | 'height' | 'cells' | 'pieces'>;

// ─────────────────────────────────────────────
// Deterministic RNG for cascade effects
// ─────────────────────────────────────────────

function rngForCascadeEffect(baseSeed: number, turnIndex: number, effectId: number): number {
  return ((baseSeed * 37) ^ (turnIndex * 19) ^ (effectId * 11)) >>> 0;
}

function pickDeterministic<T>(items: T[], seed: number): T {
  return items[seed % items.length]!;
}

// ─────────────────────────────────────────────
// Gate open logic
// ─────────────────────────────────────────────

function setGateOpen(state: EngineState, open: boolean, events?: EngineEvent[]): EngineState {
  if (state.gateOpen === open) return state;

  let nextCells = state.cells;
  if (state.gateIndices.length) {
    nextCells = nextCells.slice();
    for (const idx of state.gateIndices) {
      const c = nextCells[idx];
      if (!c) continue;
      nextCells[idx] = { ...c, blocked: true, pieceId: null, obstacle: { kind: 'gate', open } };
    }
  }

  if (open && state.gateIndices.length) events?.push({ type: 'gateOpened' });
  return { ...state, gateOpen: open, cells: nextCells };
}

// ─────────────────────────────────────────────
// Firewall damage (Level 01 mechanic)
// ─────────────────────────────────────────────

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
    if (c.obstacle?.kind !== 'firewall') continue;

    const hp = c.obstacle.hp;
    if (hp <= 0) continue;

    const x = i % width;
    const y = Math.floor(i / width);

    const hit =
      (x > 0 && clear.has(i - 1)) || (x + 1 < width && clear.has(i + 1)) || (y > 0 && clear.has(i - width)) || (y + 1 < height && clear.has(i + width));

    if (!hit) continue;

    const nextHp = hp - 1;

    if (!changed) {
      nextCells = state.cells.slice();
      changed = true;
    }

    if (nextHp > 0) {
      nextCells[i] = {
        ...c,
        obstacle: { kind: 'firewall', hp: nextHp, maxHp: c.obstacle.maxHp },
      };
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

// ─────────────────────────────────────────────
// Contamination clearing (Level 02 mechanic)
// ─────────────────────────────────────────────

function clearAdjacentContamination(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  if (clearIndices.length === 0) return state;

  const { width, height, cells } = state;
  const clearSet = new Set(clearIndices);
  const toClear: number[] = [];

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === 'contamination') {
        toClear.push(n);
      }
    }
  }

  if (toClear.length === 0) return state;

  // Dedupe
  const unique = [...new Set(toClear)].sort((a, b) => a - b);

  const nextCells = cells.slice();
  for (const idx of unique) {
    nextCells[idx] = { blocked: false, pieceId: null };
  }

  events.push({ type: 'contaminationCleared', indices: unique });

  return { ...state, cells: nextCells };
}

// ─────────────────────────────────────────────
// SealKit triggering (Level 02 mechanic)
// ─────────────────────────────────────────────

function triggerAdjacentSealKits(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  if (clearIndices.length === 0) return state;

  const { width, height, cells } = state;
  const clearSet = new Set(clearIndices);
  const sealKitIndices: number[] = [];

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const obs = cells[n]?.obstacle;
      if (obs?.kind === 'sealKit') {
        sealKitIndices.push(n);
      }
    }
  }

  if (sealKitIndices.length === 0) return state;

  // Dedupe and sort (deterministic order)
  const unique = [...new Set(sealKitIndices)].sort((a, b) => a - b);

  const nextCells = cells.slice();
  let leaksSealed = state.leaksSealed;

  for (const kitIdx of unique) {
    // Find nearest open leak from this kit's position
    const targetLeakId = getNearestOpenLeakId(kitIdx, width, nextCells);

    if (targetLeakId === null) {
      // No open leak to patch, just remove kit
      nextCells[kitIdx] = { blocked: false, pieceId: null };
      continue;
    }

    // Find the leak cell
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

    // Apply patch progress
    const newProgress = leakObs.progress + 1;
    const isSealed = newProgress >= leakObs.required;

    nextCells[leakCellIdx] = {
      ...leakCell,
      obstacle: { ...leakObs, progress: newProgress },
    };

    // Remove seal kit
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

// ─────────────────────────────────────────────
// SealKit spawning (Level 02 mechanic)
// ─────────────────────────────────────────────

function spawnSealKitsNearLeaks(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  if (clearIndices.length === 0) return state;

  const { width, height, cells, seed, turnIndex, maxSealKitsOnBoard } = state;
  const clearSet = new Set(clearIndices);

  // Find all open leaks that are adjacent to any clear index
  const leaksToSpawnFor: { leakIdx: number; leakId: number }[] = [];

  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (obs?.kind !== 'leak') continue;
    if (obs.progress >= obs.required) continue; // sealed

    // Check if any clearIndex is adjacent
    const neighbors = getOrthogonalNeighbors(i, width, height);
    const hasAdjacentClear = neighbors.some((n) => clearSet.has(n));

    if (hasAdjacentClear) {
      leaksToSpawnFor.push({ leakIdx: i, leakId: obs.id });
    }
  }

  if (leaksToSpawnFor.length === 0) return state;

  const nextCells = cells.slice();
  let spawned = 0;

  for (const { leakIdx, leakId } of leaksToSpawnFor) {
    // Check max seal kits cap
    const currentKits = countSealKits(nextCells);
    if (maxSealKitsOnBoard > 0 && currentKits >= maxSealKitsOnBoard) {
      break;
    }

    // Find free neighbor to spawn kit
    const neighbors = getOrthogonalNeighbors(leakIdx, width, height);
    const freeNeighbors = neighbors.filter((n) => {
      const c = nextCells[n];
      if (!c) return false;
      if (c.blocked) return false;
      if (c.obstacle) return false;
      // Can spawn on cell with piece (piece gets replaced)
      return true;
    });

    if (freeNeighbors.length === 0) continue;

    // Deterministic pick
    const rng = rngForCascadeEffect(seed, turnIndex, leakId + spawned * 100);
    const spawnIdx = pickDeterministic(freeNeighbors, rng);

    const targetCell = nextCells[spawnIdx]!;

    // Remove piece if present
    let nextPieces = state.pieces;
    if (targetCell.pieceId !== null) {
      nextPieces = { ...state.pieces };
      delete nextPieces[targetCell.pieceId];
      state = { ...state, pieces: nextPieces };
    }

    // Place seal kit
    nextCells[spawnIdx] = {
      blocked: true,
      pieceId: null,
      obstacle: { kind: 'sealKit' },
    };

    events.push({ type: 'sealKitSpawned', index: spawnIdx, leakId });
    spawned++;
  }

  return { ...state, cells: nextCells };
}

// ─────────────────────────────────────────────
// Combined adjacency effects (Pre-Clear)
// ─────────────────────────────────────────────

function applyAdjacencyEffects(state: EngineState, clearIndices: number[], events: EngineEvent[]): EngineState {
  let s = state;

  // 1) Clear adjacent contamination
  s = clearAdjacentContamination(s, clearIndices, events);

  // 2) Trigger adjacent seal kits (patch leaks)
  s = triggerAdjacentSealKits(s, clearIndices, events);

  // 3) Spawn seal kits near leaks
  s = spawnSealKitsNearLeaks(s, clearIndices, events);

  return s;
}

// ─────────────────────────────────────────────
// Clear cells and pieces
// ─────────────────────────────────────────────

function clearCellsAndPieces(state: EngineState, indices: number[]): EngineState {
  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  for (const idx of indices) {
    const c = nextCells[idx];
    if (!c || c.blocked) continue;
    if (c.obstacle) continue; // Don't clear obstacles this way
    const pid = c.pieceId;
    if (pid !== null) {
      delete nextPieces[pid];
      nextCells[idx] = { ...c, pieceId: null };
    }
  }

  return { ...state, cells: nextCells, pieces: nextPieces, selectedIndex: null };
}

// ─────────────────────────────────────────────
// Gravity
// ─────────────────────────────────────────────

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

      // Blocked cells or cells with obstacles block gravity
      if (c.blocked || c.obstacle) {
        writeY = y - 1;
        continue;
      }
      if (c.pieceId === null) continue;

      while (writeY >= 0) {
        const wIdx = writeY * width + x;
        const wc = state.cells[wIdx]!;
        if (!wc.blocked && !wc.obstacle) break;
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

  // keep blocked/obstacle cells empty
  for (let i = 0; i < size; i++) {
    if (nextCells[i]!.blocked || nextCells[i]!.obstacle) {
      nextCells[i]!.pieceId = null;
    }
  }

  return { ...state, cells: nextCells, pieces: nextPieces };
}

// ─────────────────────────────────────────────
// Refill
// ─────────────────────────────────────────────

function applyRefill(state: EngineState): { state: EngineState; spawned: number } {
  const { width, height, allowedTypes } = state;

  const nextCells = state.cells.slice();
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  let rngState = state.rngState;
  let nextPieceId = state.nextPieceId;
  let spawned = 0;

  const boardView: BoardView = { width, height, cells: nextCells, pieces: nextPieces };

  // spawn in all empty, non-blocked, non-obstacle cells
  for (let idx = 0; idx < nextCells.length; idx++) {
    const c = nextCells[idx]!;
    if (c.blocked || c.obstacle || c.pieceId !== null) continue;

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

// ─────────────────────────────────────────────
// Resolve Once
// ─────────────────────────────────────────────

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

  // Apply firewall damage (Level 01)
  s = applyFirewallDamage(s, m.clearIndices, events);

  // Apply adjacency effects BEFORE clearing (Level 02)
  // Uses pre-clear snapshot for adjacency checks
  s = applyAdjacencyEffects(s, m.clearIndices, events);

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

// ─────────────────────────────────────────────
// Shuffle Until Valid
// ─────────────────────────────────────────────

export function shuffleUntilValid(state: EngineState, maxAttempts: number): { state: EngineState; attempts: number } {
  const indices: number[] = [];
  const pieceIds: PieceId[] = [];

  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i]!;
    if (c.blocked) continue;
    if (c.obstacle) continue;
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

// ─────────────────────────────────────────────
// Stabilize Board
// ─────────────────────────────────────────────

export function stabilizeBoard(
  state: EngineState,
  opts?: { maxResolveLoops?: number; maxShuffleAttempts?: number; maxDeadlockPasses?: number },
): { state: EngineState; events: EngineEvent[] } {
  const maxResolveLoops = opts?.maxResolveLoops ?? 64;
  const maxShuffleAttempts = opts?.maxShuffleAttempts ?? 200;
  const maxDeadlockPasses = opts?.maxDeadlockPasses ?? 4;

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
    s = applyAdjacencyEffects(s, m.clearIndices, events);

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

  // deadlock -> shuffle -> post-resolve -> recheck (bounded passes)
  for (let pass = 0; pass < maxDeadlockPasses; pass++) {
    toPhase('deadlockCheck');
    const hasMove = hasAnyMoves(s);
    events.push({ type: 'deadlockCheck', hasMove });

    if (hasMove) break;

    const attemptsCap = pass === maxDeadlockPasses - 1 ? maxShuffleAttempts * 5 : maxShuffleAttempts;

    toPhase('shuffle');
    const sh = shuffleUntilValid(s, attemptsCap);
    s = sh.state;
    devAssert('stabilize:shuffleUntilValid');
    events.push({ type: 'shuffled', attempts: sh.attempts });

    // post-shuffle safety resolve (to guarantee match-free)
    for (let loop = 0; loop < maxResolveLoops; loop++) {
      toPhase('detect');
      const m = detectMatches(s);
      if (m.clearIndices.length === 0) break;

      events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });
      s = applyFirewallDamage(s, m.clearIndices, events);
      s = applyAdjacencyEffects(s, m.clearIndices, events);

      toPhase('mark');
      // (future) spawnPlan/specials go here

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
      // (instant settle for now)
    }
  }

  toPhase('idle');

  return { state: s, events };
}
