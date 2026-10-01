/**
 * Signal Network — BFS path check from Source to Target
 *
 * Win condition: orthogonal path of charged cells connects
 * any Source neighbor to any Target neighbor.
 */
import type { Cell, EngineState } from '../../types';
import { getOrthogonalNeighbors } from '../math/neighbors';

/**
 * Check if a cell is "conductive" for signal path
 */
function isConductive(cell: Cell): boolean {
  return cell.obstacle?.kind === 'chargedCell';
}

/**
 * Get indices of all signal source obstacles
 */
export function getSignalSourceIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'signalSource') {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Get indices of all signal target obstacles
 */
export function getSignalTargetIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'signalTarget') {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * BFS to check if any Source is connected to any Target via charged cells
 *
 * Returns true if a path exists:
 * Source (node) -> charged neighbor -> ... -> charged neighbor -> Target (node)
 *
 * Note: Source and Target themselves don't need to be charged - they are "nodes"
 * that connect to adjacent charged cells.
 */
export function isSignalLinked(state: EngineState): boolean {
  const { width, height, cells } = state;

  const sources = getSignalSourceIndices(cells);
  const targets = getSignalTargetIndices(cells);

  if (sources.length === 0 || targets.length === 0) return false;

  // Build set of target indices for fast lookup
  const targetSet = new Set(targets);

  // BFS from charged cells adjacent to any source
  const visited = new Set<number>();
  const queue: number[] = [];

  // Seed BFS with charged neighbors of sources
  for (const sourceIdx of sources) {
    const neighbors = getOrthogonalNeighbors(sourceIdx, width, height);
    for (const n of neighbors) {
      const cell = cells[n];
      if (!cell) continue;

      // If source directly touches target, win!
      if (targetSet.has(n)) return true;

      // Add charged neighbors to BFS queue
      if (isConductive(cell) && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  // If no charged cells touch any source, no path possible
  if (queue.length === 0) return false;

  // BFS through charged cells
  while (queue.length > 0) {
    const current = queue.shift()!;

    const neighbors = getOrthogonalNeighbors(current, width, height);
    for (const n of neighbors) {
      if (visited.has(n)) continue;

      const cell = cells[n];
      if (!cell) continue;

      // Check if we reached a target
      if (targetSet.has(n)) {
        return true;
      }

      // Continue BFS only through charged cells
      if (!isConductive(cell)) continue;

      visited.add(n);
      queue.push(n);
    }
  }

  return false;
}

/**
 * Count charged cells on the board
 */
export function countChargedCells(cells: Cell[]): number {
  let count = 0;
  for (const cell of cells) {
    if (cell.obstacle?.kind === 'chargedCell') count++;
  }
  return count;
}

// ─────────────────────────────────────────────
// Level 04 variant: Firewall A ↔ Firewall B as endpoints
// ─────────────────────────────────────────────

function getLevel04FirewallEndpointIndices(cells: Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const obs = cells[i]?.obstacle;
    if (!obs) continue;
    if (obs.kind !== 'firewall') continue;
    if (obs.origin !== 'level4Dormant') continue;
    out.push(i);
  }

  // Deterministic ordering
  out.sort((a, b) => a - b);
  return out;
}

/**
 * Level 04: BFS to check whether the two dormant firewall nodes are connected
 * via charged cells (orthogonal).
 */
export function isSignalLinkedLevel04ByFirewalls(state: EngineState): boolean {
  if (state.levelId !== 4) return false;

  const { width, height, cells } = state;
  const endpoints = getLevel04FirewallEndpointIndices(cells);
  if (endpoints.length !== 2) return false;

  const a = endpoints[0]!;
  const b = endpoints[1]!;

  // BFS from charged cells adjacent to A, stop when we can reach B
  const visited = new Set<number>();
  const queue: number[] = [];

  const seedNeighbors = getOrthogonalNeighbors(a, width, height);
  for (const n of seedNeighbors) {
    const cell = cells[n];
    if (!cell) continue;

    // Direct touch
    if (n === b) return true;

    if (isConductive(cell) && !visited.has(n)) {
      visited.add(n);
      queue.push(n);
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

      if (n === b) return true;

      if (!isConductive(cell)) continue;

      visited.add(n);
      queue.push(n);
    }
  }

  return false;
}
