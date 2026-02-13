// src/gamelogic/board/terminals/objectiveTerminals.ts
import { isObjectiveTerminalActive as isObjectiveTerminalActiveCell, type Cell, type CellObstacle } from '../../types';

export function getObjectiveTerminalAt(cells: Cell[], index: number): Extract<CellObstacle, { kind: 'objectiveTerminal' }> | null {
  const obs = cells[index]?.obstacle;
  return obs?.kind === 'objectiveTerminal' ? obs : null;
}

export function isObjectiveTerminalCell(cells: Cell[], index: number): boolean {
  return getObjectiveTerminalAt(cells, index) !== null;
}

// ✅ RENAMED (prevents barrel export collision with types.ts)
export function isObjectiveTerminalActiveAt(cells: Cell[], index: number): boolean {
  const cell = cells[index];
  if (!cell) return false;
  return isObjectiveTerminalActiveCell(cell);
}

export function getObjectiveTerminalIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'objectiveTerminal') indices.push(i);
  }
  return indices;
}
