import type { CascadeEffect, PostStageArgs, StageResult } from '../typesEffects';
import type { EngineState } from '../../../types';
import { isSignalLinked, isSignalLinkedByFirewallEndpoints } from '../../../board/signal/signalPathCheck';
import { getSignalLinkModeForLevelId } from '../../../scenarios/policies';

function activateDormantFirewallsForSignalBreach(state: EngineState): EngineState {
  let nextCells = state.cells;
  let changed = false;

  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i]!;
    const obs = c.obstacle;

    if (!obs || obs.kind !== 'firewall') continue;
    if (obs.origin !== 'level4Dormant') continue;
    if (obs.hp > 0) continue;

    if (!changed) {
      nextCells = state.cells.slice();
      changed = true;
    }

    nextCells[i] = {
      ...c,
      obstacle: {
        ...obs,
        hp: Math.max(1, obs.maxHp | 0),
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

    const linkMode = getSignalLinkModeForLevelId(state.levelId);

    if (linkMode === 'firewallEndpoints') {
      if (!isSignalLinkedByFirewallEndpoints(state)) return { state, ctx };

      events.push({ type: 'signalLinked' });

      let nextState: EngineState = { ...state, signalLinked: true };
      nextState = activateDormantFirewallsForSignalBreach(nextState);
      return { state: nextState, ctx };
    }

    if ((state.signalSourcesTotal | 0) <= 0 || (state.signalTargetsTotal | 0) <= 0) return { state, ctx };
    if (!isSignalLinked(state)) return { state, ctx };

    events.push({ type: 'signalLinked' });

    return {
      state: { ...state, signalLinked: true },
      ctx,
    };
  },
};
