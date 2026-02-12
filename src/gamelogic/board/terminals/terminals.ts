// src/gamelogic/board/terminals/terminals.ts
import type { Cell, CellObstacle } from '../../types';

export function getTerminalAt(cells: Cell[], index: number): Extract<CellObstacle, { kind: 'terminal' }> | null {
  const obs = cells[index]?.obstacle;
  return obs?.kind === 'terminal' ? obs : null;
}

export function isTerminalCell(cells: Cell[], index: number): boolean {
  return getTerminalAt(cells, index) !== null;
}

export function canEnterTerminal(cells: Cell[], index: number): boolean {
  const terminal = getTerminalAt(cells, index);
  if (!terminal) return true;
  return terminal.state === 'open';
}

export function getTerminalIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'terminal') indices.push(i);
  }
  return indices;
}
