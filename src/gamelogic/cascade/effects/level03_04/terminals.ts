// src/gamelogic/cascade/effects/level03_04/terminals.ts
import type { EngineEvent, EngineState, PieceType } from '../../../types';
import type { CascadeEffect } from '../typesEffects';
import { getObjectiveTerminalAt, getOrthogonalNeighbors, getTerminalAt } from '../../../board';
import { isMatchableType } from '../../../match';

function chargeAdjacentTerminals(
  state: EngineState,
  clearIndices: number[],
  alreadyChargedIds: Set<number>,
  events: EngineEvent[],
): { state: EngineState; chargedIds: Set<number> } {
  if (clearIndices.length === 0) return { state, chargedIds: alreadyChargedIds };
  if (state.terminalsTotal === 0) return { state, chargedIds: alreadyChargedIds };

  const { width, height, cells, pieces } = state;
  const clearSet = new Set(clearIndices);

  const matchedTypes = new Set<PieceType>();
  for (const idx of clearIndices) {
    const pid = cells[idx]?.pieceId;
    if (pid !== null && pid !== undefined) {
      const p = pieces[pid];
      if (p && isMatchableType(p.type)) matchedTypes.add(p.type);
    }
  }

  let nextCells = cells;
  let changed = false;
  const newChargedIds = new Set(alreadyChargedIds);

  const terminalCandidates = new Map<number, number>(); // id -> index

  for (const clearIdx of clearIndices) {
    for (const n of getOrthogonalNeighbors(clearIdx, width, height)) {
      if (clearSet.has(n)) continue;
      const terminal = getTerminalAt(cells, n);
      if (terminal && terminal.state === 'locked' && !alreadyChargedIds.has(terminal.id)) {
        terminalCandidates.set(terminal.id, n);
      }
    }
  }

  for (const [terminalId, terminalIndex] of terminalCandidates) {
    const terminal = getTerminalAt(nextCells, terminalIndex);
    if (!terminal || terminal.state !== 'locked') continue;
    if (newChargedIds.has(terminalId)) continue;

    if (!matchedTypes.has(terminal.chargeColor)) continue;

    if (!changed) {
      nextCells = cells.slice();
      changed = true;
    }

    const newCharge = terminal.charge + 1;
    const newState: 'locked' | 'open' = newCharge >= terminal.requiredCharge ? 'open' : 'locked';

    nextCells[terminalIndex] = { ...nextCells[terminalIndex]!, obstacle: { ...terminal, charge: newCharge, state: newState } };
    newChargedIds.add(terminalId);

    events.push({ type: 'terminalCharged', terminalId, charge: newCharge, requiredCharge: terminal.requiredCharge });
    if (newState === 'open') events.push({ type: 'terminalOpened', terminalId });
  }

  return {
    state: changed ? { ...state, cells: nextCells } : state,
    chargedIds: newChargedIds,
  };
}

function chargeAdjacentObjectiveTerminals(
  state: EngineState,
  clearIndices: number[],
  alreadyChargedIds: Set<number>,
  events: EngineEvent[],
): { state: EngineState; chargedIds: Set<number> } {
  if (clearIndices.length === 0) return { state, chargedIds: alreadyChargedIds };
  if (state.objectiveTerminalsTotal === 0) return { state, chargedIds: alreadyChargedIds };

  const { width, height, cells } = state;
  const clearSet = new Set(clearIndices);

  let nextCells = cells;
  let changed = false;
  const newChargedIds = new Set(alreadyChargedIds);
  let terminalsActivated = state.objectiveTerminalsActivated;

  const terminalCandidates = new Map<number, number>(); // id -> index

  for (const clearIdx of clearIndices) {
    for (const n of getOrthogonalNeighbors(clearIdx, width, height)) {
      if (clearSet.has(n)) continue;
      const terminal = getObjectiveTerminalAt(cells, n);
      if (terminal && terminal.state === 'inactive' && !alreadyChargedIds.has(terminal.id)) {
        terminalCandidates.set(terminal.id, n);
      }
    }
  }

  for (const [terminalId, terminalIndex] of terminalCandidates) {
    const terminal = getObjectiveTerminalAt(nextCells, terminalIndex);
    if (!terminal || terminal.state !== 'inactive') continue;
    if (newChargedIds.has(terminalId)) continue;

    if (!changed) {
      nextCells = cells.slice();
      changed = true;
    }

    const newCharge = terminal.charge + 1;
    const newState: 'inactive' | 'active' = newCharge >= terminal.requiredCharge ? 'active' : 'inactive';

    nextCells[terminalIndex] = { ...nextCells[terminalIndex]!, obstacle: { ...terminal, charge: newCharge, state: newState } };
    newChargedIds.add(terminalId);

    events.push({ type: 'objectiveTerminalCharged', terminalId, charge: newCharge, required: terminal.requiredCharge });

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

export const terminalsChargeEffect: CascadeEffect = {
  id: 'level03_04.terminalsCharge',
  preClear: ({ state, match, ctx, events }) => {
    let s = state;
    let chargedIds = ctx.chargedIds;

    const a = chargeAdjacentTerminals(s, match.clearIndices, chargedIds, events);
    s = a.state;
    chargedIds = a.chargedIds;

    const b = chargeAdjacentObjectiveTerminals(s, match.clearIndices, chargedIds, events);
    s = b.state;
    chargedIds = b.chargedIds;

    return { state: s, ctx: { chargedIds } };
  },
};
