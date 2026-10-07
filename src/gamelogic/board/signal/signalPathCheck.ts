/**
 * Signal Network — BFS path checks.
 */
import type { Cell, EngineState } from '../../types';
import { getOrthogonalNeighbors } from '../math/neighbors';

function isConductive(cell: Cell): boolean {
  return cell.obstacle?.kind === 'chargedCell';
}

export function getSignalSourceIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'signalSource') indices.push(i);
  }
  return indices;
}

export function getSignalTargetIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'signalTarget') indices.push(i);
  }
  return indices;
}

export function isSignalLinked(state: EngineState): boolean {
  const { width, height, cells } = state;

  const sources = getSignalSourceIndices(cells);
  const targets = getSignalTargetIndices(cells);

  if (sources.length === 0 || targets.length === 0) return false;

  const targetSet = new Set(targets);
  const visited = new Set<number>();
  const queue: number[] = [];

  for (const sourceIdx of sources) {
    const neighbors = getOrthogonalNeighbors(sourceIdx, width, height);
    for (const n of neighbors) {
      const cell = cells[n];
      if (!cell) continue;
      if (targetSet.has(n)) return true;
      if (isConductive(cell) && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  if (queue.length === 0) return false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getOrthogonalNeighbors(current, width, height);

    for (const n of neighbors) {
      if (visited.has(n)) continue;

      const cell = cells[n];
      if (!cell) continue;

      if (targetSet.has(n)) return true;
      if (!isConductive(cell)) continue;

      visited.add(n);
      queue.push(n);
    }
  }

  return false;
}

export function countChargedCells(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    if (cell.obstacle?.kind === 'chargedCell') count++;
  }
  return count;
}

function getDormantFirewallEndpointIndices(cells: Cell[]): number[] {
  const out: number[] = [];

  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (!obs || obs.kind !== 'firewall') continue;
    if (obs.origin !== 'level4Dormant') continue;
    out.push(i);
  }

  out.sort((a, b) => a - b);
  return out;
}

/**
 * Scenario-owned firewall endpoint path check.
 * Intentionally independent from numeric StageId.
 */
export function isSignalLinkedByFirewallEndpoints(state: EngineState): boolean {
  const { width, height, cells } = state;
  const endpoints = getDormantFirewallEndpointIndices(cells);

  if (endpoints.length !== 2) return false;

  const a = endpoints[0]!;
  const b = endpoints[1]!;

  const visited = new Set<number>();
  const queue: number[] = [];

  for (const n of getOrthogonalNeighbors(a, width, height)) {
    const cell = cells[n];
    if (!cell) continue;

    if (n === b) return true;

    if (isConductive(cell) && !visited.has(n)) {
      visited.add(n);
      queue.push(n);
    }
  }

  if (queue.length === 0) return false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const n of getOrthogonalNeighbors(current, width, height)) {
      if (visited.has(n)) continue;

      const cell = cells[n];
      if (!cell) continue;

      if (n === b) return true;
      if (!isConductive(cell)) continue;

      visited.add(n);
      queue.push(n);
    }
  }

  return false;
}
