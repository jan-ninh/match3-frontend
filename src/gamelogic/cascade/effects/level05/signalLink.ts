import type { CascadeEffect, PostStageArgs, StageResult } from '../typesEffects';
import type { EngineState } from '../../../types';
import { isSignalLinked } from '../../../board/signal/signalPathCheck';

function activateDormantFirewallsForLevel04(state: EngineState): EngineState {
  // Only Level 04 uses the "dormant firewall" activation mechanic.
  if (state.levelId !== 4) return state;

  let nextCells = state.cells;
  let changed = false;

  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i]!;
    const obs = c.obstacle;
    if (!obs || obs.kind !== 'firewall') continue;
    if (obs.origin !== 'level4Dormant') continue;

    // Dormant nodes are represented by hp<=0 at init.
    if (obs.hp > 0) continue;

    if (!changed) {
      nextCells = state.cells.slice();
      changed = true;
    }

    const nextHp = Math.max(1, obs.maxHp | 0);

    nextCells[i] = {
      ...c,
      obstacle: {
        ...obs,
        hp: nextHp,
      },
    };
  }

  if (!changed) return state;
  return { ...state, cells: nextCells };
}

export const signalLinkEffect: CascadeEffect = {
  id: 'signalLink',

  postClear({ state, ctx, events }: PostStageArgs): StageResult {
    if (state.signalLinked) return { state, ctx };

    if ((state.signalSourcesTotal | 0) <= 0 || (state.signalTargetsTotal | 0) <= 0) return { state, ctx };

    if (!isSignalLinked(state)) return { state, ctx };

    // Mark link as achieved (engine-owned, one-shot).
    events.push({ type: 'signalLinked' });

    let nextState: EngineState = { ...state, signalLinked: true };

    // Level 04: linking the signal arms the dormant firewalls.
    nextState = activateDormantFirewallsForLevel04(nextState);

    return { state: nextState, ctx };
  },
};
