import type { EngineState } from '../types';

import { isSignalLinked, isSignalLinkedLevel04ByFirewalls } from '../board/signal/signalPathCheck';

export type WinReason = 'matchRush' | 'laserRowMatch4' | 'stoneTiles' | 'gate' | 'leaks' | 'terminals' | 'objectiveTerminals' | 'signal';

export function getWinReasonIfMet(state: EngineState): WinReason | null {
  // Level 07: MatchRush win
  if ((state.matchRushTargetUnits | 0) > 0 && (state.matchRushUnits | 0) >= (state.matchRushTargetUnits | 0)) {
    return 'matchRush';
  }

  // Level 09: LaserRow -> Match4+ (engine-owned countdown)
  if ((state.laserRowMatch4Target | 0) > 0 && (state.laserRowMatch4Remaining | 0) <= 0) {
    return 'laserRowMatch4';
  }

  // Level 08: Stone Tiles win (all destroyed)
  if ((state.stoneTilesTotal | 0) > 0 && (state.stoneTilesRemaining | 0) <= 0) {
    return 'stoneTiles';
  }

  // Level 04 variant: Firewall A ↔ Firewall B link arms the nodes; win requires both destroyed.
  if (state.levelId === 4) {
    // "Signal linked" is one-shot and becomes SSOT once achieved.
    // Fallback: allow computing the link if the effect hasn't run yet.
    const linked = state.signalLinked === true || isSignalLinkedLevel04ByFirewalls(state);
    if (!linked) return null;

    if (state.breachesTotal > 0 && state.breachesRemaining <= 0) {
      return 'signal';
    }

    return null;
  }

  // Level 01: Gate win (all firewalls breached)
  // NOTE: explicitly skipped for Level 04.
  //
  // Important:
  // Some early levels don't actually have gate indices (no "gate to open" on the board).
  // In that case, the win should NOT depend on gateOpen (which might remain false forever).
  const hasGate = (state.gateIndices?.length ?? 0) > 0;
  if (state.breachesRemaining <= 0 && state.breachesTotal > 0 && (state.gateOpen || !hasGate)) {
    return 'gate';
  }

  // Level 02+: Leak win (all leaks sealed)
  if (state.leaksTotal > 0 && state.leaksSealed >= state.leaksTotal) {
    return 'leaks';
  }

  // Level 03+: Terminal win (all terminals verified)
  if (state.terminalsTotal > 0 && state.terminalsVerified >= state.terminalsTotal) {
    return 'terminals';
  }

  // Level 04+: Objective Terminal win (all terminals activated)
  if (state.objectiveTerminalsTotal > 0 && state.objectiveTerminalsActivated >= state.objectiveTerminalsTotal) {
    return 'objectiveTerminals';
  }

  // Level 03/05+: Signal Network
  if (state.signalSourcesTotal > 0 && state.signalTargetsTotal > 0) {
    const linked = state.signalLinked === true || isSignalLinked(state);
    if (!linked) return null;

    return 'signal';
  }

  return null;
}
