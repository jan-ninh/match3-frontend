import type { Cell, TerminalObstacle as TerminalObstacleType } from '../../types';
import {
  terminalAllowsSwap,
  terminalBlocksGravityFlow,
  terminalBlocksSwap,
  terminalCanHoldPiece,
  terminalKeycardSourceIndex,
} from '../../types';

export type TerminalObstacle = TerminalObstacleType;

export {
  terminalAllowsSwap,
  terminalBlocksGravityFlow,
  terminalBlocksSwap,
  terminalCanHoldPiece,
  terminalKeycardSourceIndex,
};

export function getTerminalAt(cells: Cell[], index: number): TerminalObstacle | null {
  const obs = cells[index]?.obstacle;
  return obs?.kind === 'terminal' ? obs : null;
}

export function isTerminalCell(cells: Cell[], index: number): boolean {
  return getTerminalAt(cells, index) !== null;
}

export function canEnterTerminal(cells: Cell[], index: number): boolean {
  const terminal = getTerminalAt(cells, index);
  if (!terminal) return true;
  return terminalCanHoldPiece(terminal);
}

export function getTerminalIndices(cells: Cell[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.obstacle?.kind === 'terminal') indices.push(i);
  }
  return indices;
}
