// src/gamelogic/board/gravity/gravityRules.ts
import type { Cell } from '../../types';

export function canReceiveFallingPiece(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  // Terminal: only open terminals can receive pieces
  if (obs.kind === 'terminal') {
    return obs.state === 'open';
  }

  // Other obstacles block falling pieces
  return false;
}

export function blocksGravity(cell: Cell): boolean {
  if (cell.blocked) return true;

  const obs = cell.obstacle;
  if (!obs) return false;

  // Terminal: locked/verified block, open allows pass
  if (obs.kind === 'terminal') {
    return obs.state !== 'open';
  }

  // All other obstacles block gravity
  return true;
}
