import type { Cell } from '../../types';
import { terminalBlocksGravityFlow, terminalCanHoldPiece } from '../terminals/terminals';

export function canReceiveFallingPiece(cell: Cell): boolean {
  if (cell.blocked) return false;

  const obs = cell.obstacle;
  if (!obs) return true;

  // chargedCell is passable (floor overlay)
  if (obs.kind === 'chargedCell') return true;

  // Terminal: configurable blocker/pass-through
  if (obs.kind === 'terminal') {
    return terminalCanHoldPiece(obs);
  }

  // Other obstacles block falling pieces
  return false;
}

export function blocksGravity(cell: Cell): boolean {
  if (cell.blocked) return true;

  const obs = cell.obstacle;
  if (!obs) return false;

  // chargedCell is passable (does not block gravity flow)
  if (obs.kind === 'chargedCell') return false;

  // Terminal: pass-through terminals do not split the column.
  if (obs.kind === 'terminal') {
    return terminalBlocksGravityFlow(obs);
  }

  // All other obstacles block gravity
  return true;
}
