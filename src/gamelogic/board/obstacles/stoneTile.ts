import type { Cell, EngineState } from '../../types';

export const STONE_TILE_MAX_HP = 15;

export function isStoneTile(cell: Cell): cell is Cell & { obstacle: { kind: 'stoneTile'; hp: number; maxHp: number } } {
  return cell.obstacle?.kind === 'stoneTile';
}

/**
 * Engine-owned damage application for stoneTile obstacles.
 * - Dedupes indices (same stone hit once per call).
 * - If hp reaches 0: removes obstacle + unblocks cell (becomes normal empty cell).
 * - Updates `stoneTilesRemaining` deterministically.
 */
export function applyStoneTileDamageAtIndices(state: EngineState, indices: Iterable<number>, dmg: number): EngineState {
  if ((state.stoneTilesTotal | 0) <= 0) return state;

  const d = dmg | 0;
  if (d <= 0) return state;

  let nextCells: Cell[] | null = null;
  let remaining = state.stoneTilesRemaining | 0;

  const seen = new Set<number>();
  let changed = false;

  for (const raw of indices) {
    const idx = raw | 0;
    if (idx < 0 || idx >= state.cells.length) continue;
    if (seen.has(idx)) continue;
    seen.add(idx);

    const cell = (nextCells ?? state.cells)[idx]!;
    const obs = cell.obstacle;
    if (!obs || obs.kind !== 'stoneTile') continue;

    const hp = obs.hp | 0;
    const maxHp = (obs.maxHp | 0) > 0 ? (obs.maxHp | 0) : STONE_TILE_MAX_HP;

    const nextHp = Math.max(0, hp - d);
    if (nextHp === hp) continue;

    if (!nextCells) nextCells = state.cells.slice();

    if (nextHp <= 0) {
      // destroyed: becomes normal empty cell
      nextCells[idx] = { blocked: false, pieceId: null };
      if (remaining > 0) remaining -= 1;
    } else {
      nextCells[idx] = {
        ...nextCells[idx]!,
        obstacle: { kind: 'stoneTile', hp: nextHp, maxHp },
      };
    }

    changed = true;
  }

  if (!changed || !nextCells) return state;

  return {
    ...state,
    cells: nextCells,
    stoneTilesRemaining: Math.max(0, remaining | 0),
  };
}
