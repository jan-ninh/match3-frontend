import type { EngineState } from '../types';

import { isSignalLinked, isSignalLinkedByFirewallEndpoints } from '../board/signal/signalPathCheck';
import { isSignalBreachStage } from '../scenarios/policies';

export type WinReason = 'collect' | 'matchRush' | 'laserRowMatch4' | 'stoneTiles' | 'gate' | 'leaks' | 'terminals' | 'objectiveTerminals' | 'signal';

export function getWinReasonIfMet(state: EngineState): WinReason | null {
  if ((state.collectTarget | 0) > 0 && (state.collectCount | 0) >= (state.collectTarget | 0)) {
    return 'collect';
  }

  if ((state.matchRushTargetUnits | 0) > 0 && (state.matchRushUnits | 0) >= (state.matchRushTargetUnits | 0)) {
    return 'matchRush';
  }

  if ((state.laserRowMatch4Target | 0) > 0 && (state.laserRowMatch4Remaining | 0) <= 0) {
    return 'laserRowMatch4';
  }

  if ((state.stoneTilesTotal | 0) > 0 && (state.stoneTilesRemaining | 0) <= 0) {
    return 'stoneTiles';
  }

  if (isSignalBreachStage(state.levelId)) {
    const linked = state.signalLinked === true || isSignalLinkedByFirewallEndpoints(state);
    if (!linked) return null;

    if (state.breachesTotal > 0 && state.breachesRemaining <= 0) {
      return 'signal';
    }

    return null;
  }

  const hasGate = (state.gateIndices?.length ?? 0) > 0;
  if (state.breachesRemaining <= 0 && state.breachesTotal > 0 && (state.gateOpen || !hasGate)) {
    return 'gate';
  }

  if (state.leaksTotal > 0 && state.leaksSealed >= state.leaksTotal) {
    return 'leaks';
  }

  if (state.terminalsTotal > 0 && state.terminalsVerified >= state.terminalsTotal) {
    return 'terminals';
  }

  if (state.objectiveTerminalsTotal > 0 && state.objectiveTerminalsActivated >= state.objectiveTerminalsTotal) {
    return 'objectiveTerminals';
  }

  if (state.signalSourcesTotal > 0 && state.signalTargetsTotal > 0) {
    const linked = state.signalLinked === true || isSignalLinked(state);
    if (!linked) return null;

    return 'signal';
  }

  return null;
}
