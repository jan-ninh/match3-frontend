// src/gamelogic/cascade.ts
import type { EngineEvent, EngineState, Piece, PieceId, PieceType } from './types';
import type { EnginePhase } from './phases';
import { detectMatches, hasAnyMoves, isMatchableType, wouldCreateMatchAt } from './match';
import { rngNextInt, rngShuffleInPlace } from './rng';
import { setPhase } from './phaseState';
import { assertPhaseInvariants } from './invariants';
import {
  blocksGravity,
  canReceiveFallingPiece,
  countSealKits,
  getNearestOpenLeakId,
  getObjectiveTerminalAt,
  getOrthogonalNeighbors,
  getTerminalAt,
} from './board';

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
// Terminal Charging (Level 03 mechanic)
// ─────────────────────────────────────────────

/**
 * Charge terminals adjacent to matched pieces.
 * Each terminal can only be charged once per move (tracked via chargedIds Set).
 * Terminal charges if: adjacent to match AND match contains terminal's chargeColor.
 */
function chargeAdjacentTerminals(
  state: EngineState,
  clearIndices: number[],
  alreadyChargedIds: Set<number>,
  events: EngineEvent[],
): { state: EngineState; chargedIds: Set<number> } {
  if (clearIndices.length === 0) {
    return { state, chargedIds: alreadyChargedIds };
  }

  const { width, height, cells, pieces } = state;
  const clearSet = new Set(clearIndices);

  // Collect piece types in the match (before they're cleared)
  const matchedTypes = new Set<PieceType>();
  for (const idx of clearIndices) {
    const pid = cells[idx]?.pieceId;
    if (pid !== null && pid !== undefined) {
      const p = pieces[pid];
      if (p && isMatchableType(p.type)) {
        matchedTypes.add(p.type);
      }
    }
  }

  let nextCells = cells;
  let changed = false;
  const newChargedIds = new Set(alreadyChargedIds);

  // Find terminals adjacent to any cleared cell
  const terminalCandidates = new Map<number, number>(); // terminalId -> cellIndex

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const terminal = getTerminalAt(cells, n);
      if (terminal && terminal.state === 'locked' && !alreadyChargedIds.has(terminal.id)) {
        terminalCandidates.set(terminal.id, n);
      }
    }
  }

  // Process each terminal candidate
  for (const [terminalId, terminalIndex] of terminalCandidates) {
    const terminal = getTerminalAt(nextCells, terminalIndex);
    if (!terminal || terminal.state !== 'locked') continue;
    if (newChargedIds.has(terminalId)) continue;

    // Check if match contains the terminal's chargeColor
    if (!matchedTypes.has(terminal.chargeColor)) continue;

    // Charge the terminal
    if (!changed) {
      nextCells = cells.slice();
      changed = true;
    }

    const newCharge = terminal.charge + 1;
    const newState: 'locked' | 'open' = newCharge >= terminal.requiredCharge ? 'open' : 'locked';

    nextCells[terminalIndex] = {
      ...nextCells[terminalIndex]!,
      obstacle: { ...terminal, charge: newCharge, state: newState },
    };

    newChargedIds.add(terminalId);

    events.push({ type: 'terminalCharged', terminalId, charge: newCharge, requiredCharge: terminal.requiredCharge });

    if (newState === 'open') {
      events.push({ type: 'terminalOpened', terminalId });
    }
  }

  return {
    state: changed ? { ...state, cells: nextCells } : state,
    chargedIds: newChargedIds,
  };
}

// ─────────────────────────────────────────────
// Objective Terminal Charging (Level 04 Boss mechanic)
// ─────────────────────────────────────────────

/**
 * Charge objective terminals adjacent to matched pieces.
 * Unlike Level 03 terminals, these charge from ANY adjacent match (no color requirement).
 * Each terminal can only be charged once per move (tracked via chargedIds Set).
 */
function chargeAdjacentObjectiveTerminals(
  state: EngineState,
  clearIndices: number[],
  alreadyChargedIds: Set<number>,
  events: EngineEvent[],
): { state: EngineState; chargedIds: Set<number> } {
  if (clearIndices.length === 0) {
    return { state, chargedIds: alreadyChargedIds };
  }

  // Skip if no objective terminals
  if (state.objectiveTerminalsTotal === 0) {
    return { state, chargedIds: alreadyChargedIds };
  }

  const { width, height, cells } = state;
  const clearSet = new Set(clearIndices);

  let nextCells = cells;
  let changed = false;
  const newChargedIds = new Set(alreadyChargedIds);
  let terminalsActivated = state.objectiveTerminalsActivated;

  // Find objective terminals adjacent to any cleared cell
  const terminalCandidates = new Map<number, number>(); // terminalId -> cellIndex

  for (const clearIdx of clearIndices) {
    const neighbors = getOrthogonalNeighbors(clearIdx, width, height);
    for (const n of neighbors) {
      if (clearSet.has(n)) continue;
      const terminal = getObjectiveTerminalAt(cells, n);
      if (terminal && terminal.state === 'inactive' && !alreadyChargedIds.has(terminal.id)) {
        terminalCandidates.set(terminal.id, n);
      }
    }
  }

  // Process each terminal candidate
  for (const [terminalId, terminalIndex] of terminalCandidates) {
    const terminal = getObjectiveTerminalAt(nextCells, terminalIndex);
    if (!terminal || terminal.state !== 'inactive') continue;
    if (newChargedIds.has(terminalId)) continue;

    // Charge the terminal (any match works, no color check)
    if (!changed) {
      nextCells = cells.slice();
      changed = true;
    }

    const newCharge = terminal.charge + 1;
    const newState: 'inactive' | 'active' = newCharge >= terminal.requiredCharge ? 'active' : 'inactive';

    nextCells[terminalIndex] = {
      ...nextCells[terminalIndex]!,
      obstacle: { ...terminal, charge: newCharge, state: newState },
    };

    newChargedIds.add(terminalId);

    events.push({
      type: 'objectiveTerminalCharged',
      terminalId,
      charge: newCharge,
      requiredCharge: terminal.requiredCharge,
    });

    if (newState === 'active') {
      events.push({ type: 'objectiveTerminalActivated', terminalId });
      terminalsActivated++;
    }
  }

  return {
    state: changed ? { ...state, cells: nextCells, objectiveTerminalsActivated: terminalsActivated } : state,
    chargedIds: newChargedIds,
  };
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
  const { width, height, cells } = state;

  const nextCells = state.cells.map((c) => ({ ...c, pieceId: null as PieceId | null }));
  const nextPieces: Record<PieceId, Piece> = { ...state.pieces };

  const size = width * height;

  for (let x = 0; x < width; x++) {
    let writeY = height - 1;

    for (let y = height - 1; y >= 0; y--) {
      const idx = y * width + x;
      const c = cells[idx]!;

      // Check if this cell blocks gravity
      if (blocksGravity(c)) {
        writeY = y - 1;
        continue;
      }

      if (c.pieceId === null) continue;

      // Find write position
      while (writeY >= 0) {
        const wIdx = writeY * width + x;
        const wc = cells[wIdx]!;

        // Check if target can receive a piece
        if (canReceiveFallingPiece(wc)) break;

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

  // Ensure blocked/obstacle cells remain without pieces (except open terminals)
  for (let i = 0; i < size; i++) {
    const c = nextCells[i]!;
    if (c.blocked) {
      c.pieceId = null;
    } else if (c.obstacle) {
      // Terminal: open terminals can hold pieces temporarily (for delivery)
      if (c.obstacle.kind === 'terminal' && c.obstacle.state === 'open') {
        // Keep pieceId if set
      } else {
        c.pieceId = null;
      }
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

    // Skip blocked cells
    if (c.blocked) continue;

    // Skip obstacle cells (including terminals - don't spawn random pieces there)
    if (c.obstacle) continue;

    // Skip cells that already have pieces
    if (c.pieceId !== null) continue;

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
  chargedIds: Set<number>;
};

export function resolveOnce(state: EngineState, chargedIds: Set<number> = new Set()): ResolveOnceResult {
  let s = state;
  const events: EngineEvent[] = [];

  events.push({ type: 'phase', phase: 'detect' });
  const m = detectMatches(s);
  if (m.clearIndices.length === 0) {
    return { state: s, events, didResolve: false, chargedIds };
  }

  events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });

  // Apply firewall damage (Level 01)
  s = applyFirewallDamage(s, m.clearIndices, events);

  // Apply adjacency effects BEFORE clearing (Level 02)
  s = applyAdjacencyEffects(s, m.clearIndices, events);

  // Charge terminals (Level 03) - BEFORE clearing, uses match info
  const chargeResult = chargeAdjacentTerminals(s, m.clearIndices, chargedIds, events);
  s = chargeResult.state;
  let updatedChargedIds = chargeResult.chargedIds;

  // Charge objective terminals (Level 04) - BEFORE clearing
  const objChargeResult = chargeAdjacentObjectiveTerminals(s, m.clearIndices, updatedChargedIds, events);
  s = objChargeResult.state;
  updatedChargedIds = objChargeResult.chargedIds;

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

  return { state: s, events, didResolve: true, chargedIds: updatedChargedIds };
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

    // Don't shuffle keycards - they should stay in place
    const piece = state.pieces[c.pieceId];
    if (piece && piece.type === 'keycard') continue;

    indices.push(i);
    pieceIds.push(c.pieceId as PieceId);
  }

  let rngState = state.rngState;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const perm = pieceIds.slice();
    const sh = rngShuffleInPlace(rngState, perm);
    rngState = sh.state;

    const nextCells = state.cells.map((c) => {
      // Keep keycards in their cells
      const piece = c.pieceId !== null ? state.pieces[c.pieceId] : null;
      if (piece && piece.type === 'keycard') {
        return { ...c };
      }
      return { ...c, pieceId: null as PieceId | null };
    });

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

  const nextCells = state.cells.map((c) => {
    const piece = c.pieceId !== null ? state.pieces[c.pieceId] : null;
    if (piece && piece.type === 'keycard') {
      return { ...c };
    }
    return { ...c, pieceId: null as PieceId | null };
  });

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

  // Track charged terminals for this stabilization pass
  let chargedIds = new Set<number>();

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

    // Charge terminals
    const chargeResult = chargeAdjacentTerminals(s, m.clearIndices, chargedIds, events);
    s = chargeResult.state;
    chargedIds = chargeResult.chargedIds;

    // Level 04: Objective terminal charging
    const objChargeResult = chargeAdjacentObjectiveTerminals(s, m.clearIndices, chargedIds, events);
    s = objChargeResult.state;
    chargedIds = objChargeResult.chargedIds;

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

    // Reset chargedIds for post-shuffle resolve (new "move" context)
    chargedIds = new Set<number>();

    // post-shuffle safety resolve (to guarantee match-free)
    for (let loop = 0; loop < maxResolveLoops; loop++) {
      toPhase('detect');
      const m = detectMatches(s);
      if (m.clearIndices.length === 0) break;

      events.push({ type: 'matchesFound', clears: m.clearIndices.length, groups: m.groups });
      s = applyFirewallDamage(s, m.clearIndices, events);
      s = applyAdjacencyEffects(s, m.clearIndices, events);

      const chargeResult = chargeAdjacentTerminals(s, m.clearIndices, chargedIds, events);
      s = chargeResult.state;
      chargedIds = chargeResult.chargedIds;

      // Level 04: Objective terminal charging
      const objChargeResult = chargeAdjacentObjectiveTerminals(s, m.clearIndices, chargedIds, events);
      s = objChargeResult.state;
      chargedIds = objChargeResult.chargedIds;

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
