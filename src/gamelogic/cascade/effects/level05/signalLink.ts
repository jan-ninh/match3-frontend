import type { CascadeEffect, PostStageArgs, StageResult } from '../typesEffects';
import type { EngineState } from '../../../types';
import { isSignalLinked, isSignalLinkedLevel04ByFirewalls } from '../../../board/signal/signalPathCheck';

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

    // Level 04: endpoints are the two dormant firewalls (no signal nodes).
    if (state.levelId === 4) {
      if (!isSignalLinkedLevel04ByFirewalls(state)) return { state, ctx };

      events.push({ type: 'signalLinked' });

      let nextState: EngineState = { ...state, signalLinked: true };
      nextState = activateDormantFirewallsForLevel04(nextState);
      return { state: nextState, ctx };
    }

    // Default Signal Network: requires explicit source+target nodes.
    if ((state.signalSourcesTotal | 0) <= 0 || (state.signalTargetsTotal | 0) <= 0) return { state, ctx };

    if (!isSignalLinked(state)) return { state, ctx };

    // Mark link as achieved (engine-owned, one-shot).
    events.push({ type: 'signalLinked' });

    const nextState: EngineState = { ...state, signalLinked: true };
    return { state: nextState, ctx };
  },
};
