// src/gamelogic/cascade/effects/level01/firewallDamage.ts
import type { EngineEvent, EngineState } from '../../../types';
import type { CascadeEffect } from '../typesEffects';
import { setGateOpen } from './gate';

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
      nextCells[i] = { ...c, obstacle: { kind: 'firewall', hp: nextHp, maxHp: c.obstacle.maxHp } };
      events.push({ type: 'firewallDamaged', index: i, hp: nextHp });
      continue;
    }

    nextCells[i] = { blocked: false, pieceId: null };
    remaining = Math.max(0, remaining - 1);
    events.push({ type: 'firewallDestroyed', index: i });
  }

  let nextState: EngineState = state;

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

export const firewallDamageEffect: CascadeEffect = {
  id: 'level01.firewallDamage',
  preClear: ({ state, match, ctx, events }) => {
    const next = applyFirewallDamage(state, match.clearIndices, events);
    return { state: next, ctx };
  },
};
